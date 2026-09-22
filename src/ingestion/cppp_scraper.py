import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
try:
    import httpx
except ImportError:
    httpx = None
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CPPPScraper")

# Official Central Public Procurement Portal endpoint for active tender notices.
# This is not a contract-award register.
CPPP_BASE_URL = "https://eprocure.gov.in/eprocure/app"
CPPP_ACTIVE_TENDERS_URL = f"{CPPP_BASE_URL}?page=FrontEndLatestActiveTendersOrgwise&service=page"


class CPPPScraper:
    """
    Source-attributed CPPP/GePNIC tender-notice scraper.

    The configured page lists active tenders, not awarded contracts. Award-only
    fields are populated only when an award source explicitly provides them.
    """

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

    async def fetch_active_tenders_page(self, page_number: int = 1) -> Optional[str]:
        """
        Polls the public GePNIC active tender-notice page directly from eprocure.gov.in.
        """
        logger.info(f"Fetching CPPP active tender notices (page {page_number})...")
        if httpx is None:
            logger.error("httpx is required for CPPP retrieval; install project dependencies first.")
            return None
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=self.headers) as client:
                resp = await client.get(CPPP_ACTIVE_TENDERS_URL)
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
        Parses a GePNIC table without assuming a tender notice is a contract award.
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

            rows = table.find_all("tr")
            headers = [cell.get_text(" ", strip=True).lower() for cell in rows[0].find_all(["th", "td"])] if rows else []

            def value_for(cols: List[Any], *labels: str) -> Optional[str]:
                for index, header in enumerate(headers):
                    if index < len(cols) and any(label in header for label in labels):
                        value = cols[index].get_text(" ", strip=True)
                        return value or None
                return None

            def amount_for(value: Optional[str]) -> Optional[float]:
                if not value:
                    return None
                cleaned = value.replace(",", "").replace("₹", "").strip()
                try:
                    return float(cleaned)
                except ValueError:
                    return None

            is_award_table = any("award date" in header or "contractor" in header for header in headers)
            extracted = []
            for row in rows[1:]: # Skip header
                cols = row.find_all("td")
                tender_id = value_for(cols, "tender reference", "tender id", "tender no")
                title = value_for(cols, "tender title", "title")
                authority = value_for(cols, "organisation", "organization", "department", "authority")
                if not tender_id or not title or not authority:
                    continue

                contractor = value_for(cols, "contractor", "awarded to") if is_award_table else None
                award_date = value_for(cols, "award date") if is_award_table else None
                amount = amount_for(value_for(cols, "contract value", "award value")) if is_award_table else None
                extracted.append({
                    "tender_id": tender_id,
                    "tender_title": title,
                    "awarding_authority": authority,
                    "contractor_name": contractor,
                    "contractor_cin_or_pan": None,
                    "contract_amount": amount,
                    "award_date": award_date,
                    "execution_schedule_months": None,
                    "source_portal": "eprocure.gov.in",
                    "source_url": CPPP_ACTIVE_TENDERS_URL,
                    "record_type": "contract_award" if is_award_table else "tender_notice",
                })
            return extracted
        except ImportError:
            logger.warning("BeautifulSoup4 not installed for HTML parsing.")
            return []

    async def ingest_tenders(self, tenders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ingests validated government contracts into Supabase."""
        synced = []
        for t in tenders:
            if not t.get("tender_id") or not t.get("tender_title") or not t.get("awarding_authority"):
                continue

            record = {
                "tender_id": t["tender_id"],
                "tender_title": t["tender_title"],
                "awarding_authority": t["awarding_authority"],
                "contractor_name": t["contractor_name"],
                "contractor_cin_or_pan": t.get("contractor_cin_or_pan"),
                "contract_amount": t.get("contract_amount"),
                "award_date": t.get("award_date"),
                "execution_schedule_months": t.get("execution_schedule_months"),
                "source_portal": t.get("source_portal", "eprocure.gov.in"),
                "source_url": t.get("source_url", CPPP_ACTIVE_TENDERS_URL),
                "source_retrieved_at": datetime.now(timezone.utc).isoformat(),
                "record_type": t.get("record_type", "tender_notice"),
            }
            try:
                await supabase.upsert("procurement_tenders", [record], on_conflict="tender_id")
                logger.info(
                    f"Indexed CPPP {record['record_type']}: {record['tender_id']} | "
                    f"{record['tender_title']}"
                )
                synced.append(record)
            except Exception as e:
                logger.error(f"Failed to upsert CPPP tender {record['tender_id']}: {e}")

        return synced

    async def run(self) -> List[Dict[str, Any]]:
        """Scrapes and ingests live public procurement tender notices from CPPP."""
        logger.info("==========================================================")
        logger.info("Starting Central Public Procurement Portal (CPPP) Tender Notice Scraper")
        logger.info("==========================================================")

        html = await self.fetch_active_tenders_page()
        if not html:
            logger.warning("No live data retrieved from CPPP portal (portal may be experiencing downtime).")
            return []

        tenders = self.parse_gepnic_html_table(html)
        logger.info(f"Extracted {len(tenders)} source-attributed CPPP records.")
        results = await self.ingest_tenders(tenders)

        logger.info("==========================================================")
        logger.info(f"✅ CPPP Ingestion Complete! Synced {len(results)} live contracts.")
        logger.info("==========================================================")
        return results


cppp_scraper = CPPPScraper()

if __name__ == "__main__":
    asyncio.run(cppp_scraper.run())
