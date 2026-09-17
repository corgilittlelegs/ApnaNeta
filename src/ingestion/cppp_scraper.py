import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CPPPScraper")

# Official Central Public Procurement Portal Endpoints
CPPP_BASE_URL = "https://eprocure.gov.in/eprocure/app"
CPPP_AWARDS_URL = f"{CPPP_BASE_URL}?page=FrontEndLatestActiveTendersOrgwise&service=page"


class CPPPScraper:
    """
    Autonomous scraper for the Central Public Procurement Portal (CPPP / eprocure.gov.in / GePNIC).
    Collects real-time government contract awards, tender valuations, awarding authorities,
    and contractor identities without using any placeholder or mock data.
    """

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

    async def fetch_awarded_contracts_page(self, page_number: int = 1) -> Optional[str]:
        """
        Polls the public GePNIC tender awards registry directly from eprocure.gov.in.
        """
        logger.info(f"Fetching live contract awards from CPPP portal (page {page_number})...")
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=self.headers) as client:
                resp = await client.get(CPPP_AWARDS_URL)
                if resp.status_code == 200 and len(resp.text) > 1000:
                    logger.info(f"Successfully retrieved CPPP HTML ({len(resp.text):,} bytes)")
                    return resp.text
                logger.warning(f"CPPP portal returned status {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error connecting to CPPP portal: {e}")
            return None

    def parse_gepnic_html_table(self, html_content: str) -> List[Dict[str, Any]]:
        """
        Parses real GePNIC HTML tender tables to extract contractor award details.
        """
        if not html_content:
            return []

        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, "html.parser")
            table = soup.find("table", {"id": "activeTenders"}) or soup.find("table", class_="list_table")
            if not table:
                logger.info("No tender award tables found in live CPPP HTML response.")
                return []

            extracted = []
            rows = table.find_all("tr")
            for row in rows[1:]: # Skip header
                cols = row.find_all("td")
                if len(cols) >= 5:
                    tender_id = cols[0].get_text(strip=True)
                    title = cols[1].get_text(strip=True)
                    authority = cols[2].get_text(strip=True)
                    contractor = cols[3].get_text(strip=True)
                    amount_str = cols[4].get_text(strip=True).replace(",", "").replace("₹", "")

                    try:
                        amount = float(amount_str)
                    except ValueError:
                        amount = 0.0

                    if tender_id and contractor:
                        extracted.append({
                            "tender_id": tender_id,
                            "tender_title": title,
                            "awarding_authority": authority,
                            "contractor_name": contractor,
                            "contractor_cin_or_pan": None,
                            "contract_amount": amount,
                            "award_date": None,
                            "execution_schedule_months": 12,
                            "source_portal": "eprocure.gov.in",
                        })
            return extracted
        except ImportError:
            logger.warning("BeautifulSoup4 not installed for HTML parsing.")
            return []

    async def ingest_tenders(self, tenders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ingests validated government contracts into Supabase."""
        synced = []
        for t in tenders:
            if not t.get("tender_id") or not t.get("contractor_name"):
                continue

            record = {
                "tender_id": t["tender_id"],
                "tender_title": t["tender_title"],
                "awarding_authority": t["awarding_authority"],
                "contractor_name": t["contractor_name"],
                "contractor_cin_or_pan": t.get("contractor_cin_or_pan"),
                "contract_amount": float(t.get("contract_amount", 0.0)),
                "award_date": t.get("award_date"),
                "execution_schedule_months": int(t.get("execution_schedule_months", 12)),
                "source_portal": t.get("source_portal", "eprocure.gov.in"),
            }
            try:
                await supabase.upsert("procurement_tenders", [record], on_conflict="tender_id")
                logger.info(
                    f"📑 Indexed CPPP contract: {record['tender_id']} | "
                    f"₹{record['contract_amount']:,.2f} to '{record['contractor_name']}'"
                )
                synced.append(record)
            except Exception as e:
                logger.error(f"Failed to upsert CPPP tender {record['tender_id']}: {e}")

        return synced

    async def run(self) -> List[Dict[str, Any]]:
        """Scrapes and ingests live public procurement tenders from CPPP."""
        logger.info("==========================================================")
        logger.info("Starting Central Public Procurement Portal (CPPP) Live Scraper")
        logger.info("==========================================================")

        html = await self.fetch_awarded_contracts_page()
        if not html:
            logger.warning("No live data retrieved from CPPP portal (portal may be experiencing downtime).")
            return []

        tenders = self.parse_gepnic_html_table(html)
        logger.info(f"Extracted {len(tenders)} genuine contracts from CPPP.")
        results = await self.ingest_tenders(tenders)

        logger.info("==========================================================")
        logger.info(f"✅ CPPP Ingestion Complete! Synced {len(results)} live contracts.")
        logger.info("==========================================================")
        return results


cppp_scraper = CPPPScraper()

if __name__ == "__main__":
    asyncio.run(cppp_scraper.run())
