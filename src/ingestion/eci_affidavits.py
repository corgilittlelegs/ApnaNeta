import os
import sys
import io
import hashlib
import logging
import re
from typing import List, Dict, Any, Optional
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.r2_client import r2_storage
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ECIAffidavitIngest")

# Base URLs for ECI Affidavit Portal
ECI_AFFIDAVIT_BASE = "https://affidavit.eci.gov.in"
ECI_FILTER_ENDPOINT = f"{ECI_AFFIDAVIT_BASE}/CandidateCustomFilter"

# Official ECI State & Union Territory Codes for 2024 Lok Sabha
ECI_STATE_CODES = {
    "Andhra Pradesh": "S01",
    "Arunachal Pradesh": "S02",
    "Assam": "S03",
    "Bihar": "S04",
    "Goa": "S05",
    "Gujarat": "S06",
    "Haryana": "S07",
    "Himachal Pradesh": "S08",
    "Karnataka": "S10",
    "Kerala": "S11",
    "Madhya Pradesh": "S12",
    "Maharashtra": "S13",
    "Manipur": "S14",
    "Meghalaya": "S15",
    "Mizoram": "S16",
    "Nagaland": "S17",
    "Odisha": "S18",
    "Punjab": "S19",
    "Rajasthan": "S20",
    "Sikkim": "S21",
    "Tamil Nadu": "S22",
    "Tripura": "S23",
    "Uttar Pradesh": "U07",
    "Uttarakhand": "S28",
    "West Bengal": "S25",
    "Delhi": "U05",
}


class ECIAffidavitScraper:
    """
    Autonomous scraper for the Election Commission of India (ECI) affidavit portal.
    Polls official nomination feeds across state election calendars and dynamic
    constituency tree structures on affidavit.eci.gov.in without any placeholder
    or synthetic fallback data.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=1.0, max_delay=2.5)

    def _get_client(self):
        """Initializes an HTTP client with browser TLS impersonation."""
        try:
            from curl_cffi import requests as curl_requests
            return curl_requests.Session(impersonate="chrome120")
        except ImportError:
            import httpx
            return httpx.Client(
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
            )

    async def fetch_pdf(self, pdf_url: str) -> Optional[bytes]:
        """Downloads a Form 26 affidavit PDF with polite pacing and error handling."""
        await self.rate_limiter.wait()
        logger.info(f"Attempting live fetch of affidavit: {pdf_url}")

        try:
            session = self._get_client()
            response = session.get(pdf_url, timeout=25)
            if response.status_code == 200 and len(response.content) > 1000 and response.content.startswith(b"%PDF"):
                logger.info(f"Successfully downloaded live affidavit PDF ({len(response.content):,} bytes)")
                return response.content
            logger.warning(f"Live fetch returned status {response.status_code} (non-PDF or portal protected)")
            return None
        except Exception as e:
            logger.warning(f"Live fetch could not reach ECI portal directly ({e})")
            return None

    async def discover_constituency_candidates(
        self,
        election_type: str = "24-PC-GENERAL-1-2024",
        state_name: str = "Uttar Pradesh",
        constituency_no: int = 77,
    ) -> List[Dict[str, Any]]:
        """
        Dynamically queries the official ECI CandidateCustomFilter endpoint
        for a given state and constituency to extract real candidate nominations and PDF links.
        """
        state_code = ECI_STATE_CODES.get(state_name, "U07")
        params = {
            "electionType": election_type,
            "state": state_code,
            "constituency": str(constituency_no),
        }
        url = f"{ECI_FILTER_ENDPOINT}?electionType={election_type}&state={state_code}&constituency={constituency_no}"
        logger.info(f"Querying ECI dynamic nomination feed: {url}")

        try:
            session = self._get_client()
            response = session.get(url, timeout=20)
            if response.status_code != 200 or len(response.text) < 500:
                logger.warning(f"ECI endpoint returned status {response.status_code}")
                return []

            # Parse candidate rows and PDF links from HTML table
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            table = soup.find("table")
            if not table:
                logger.info("No nomination table found in ECI HTML response.")
                return []

            nominations = []
            for row in table.find_all("tr")[1:]:
                cols = row.find_all("td")
                if len(cols) >= 4:
                    cand_name = cols[1].get_text(strip=True)
                    party_name = cols[2].get_text(strip=True)
                    # Find affidavit PDF link
                    pdf_link = None
                    for a_tag in row.find_all("a", href=True):
                        href = a_tag["href"]
                        if ".pdf" in href.lower() or "download" in href.lower() or "affidavit" in href.lower():
                            pdf_link = href if href.startswith("http") else f"{ECI_AFFIDAVIT_BASE}/{href.lstrip('/')}"
                            break

                    if cand_name and pdf_link:
                        nominations.append({
                            "name": cand_name,
                            "party": party_name,
                            "state": state_name,
                            "constituency": f"Constituency {constituency_no}",
                            "house": "Lok Sabha",
                            "filing_year": 2024,
                            "pdf_url": pdf_link,
                        })
            logger.info(f"Discovered {len(nominations)} candidate nomination(s) from ECI feed.")
            return nominations
        except Exception as e:
            logger.error(f"Error scraping ECI candidate filter: {e}")
            return []

    async def process_candidate_nomination(
        self,
        candidate_name: str,
        state: str,
        constituency: str,
        filing_year: int,
        house: str,
        party: Optional[str],
        pdf_url: str,
    ) -> Optional[Dict[str, Any]]:
        """
        End-to-end ingestion of a single candidate filing:
        1. Downloads live affidavit PDF from ECI portal.
        2. Computes SHA-256 fingerprint.
        3. Uploads immutable copy to Cloudflare R2 bucket.
        4. Registers candidate & affidavit metadata in Supabase.
        Zero synthetic fallbacks: If the live PDF cannot be obtained, returns None cleanly.
        """
        logger.info(f"Processing affidavit nomination: {candidate_name} ({constituency}, {state})")

        # 1. Fetch live PDF
        pdf_bytes = await self.fetch_pdf(pdf_url)
        if not pdf_bytes:
            logger.warning(
                f"Could not download live affidavit from {pdf_url} for {candidate_name}. "
                f"Skipping to preserve primary-source data integrity (no synthetic fallbacks allowed)."
            )
            return None

        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
        logger.info(f"Cryptographic SHA-256 fingerprint: {sha256_hash}")

        # 2. Upload immutable copy to Cloudflare R2 object storage
        r2_key = r2_storage.upload_affidavit_pdf(pdf_bytes, sha256_hash=sha256_hash)
        logger.info(f"Cloudflare R2 storage key: {r2_key}")

        # 3. Match or Create Candidate Anchor in Supabase
        candidate_id: Optional[str] = None
        try:
            matched = await supabase.select("candidates", {"name": f"eq.{candidate_name}", "limit": "1"})
            if matched:
                candidate_id = matched[0].get("id")
                logger.info(f"Linked to existing candidate anchor: {candidate_id}")
            else:
                new_cands = await supabase.insert(
                    "candidates",
                    [
                        {
                            "name": candidate_name,
                            "state": state,
                            "constituency": constituency,
                            "house": house,
                            "party": party,
                        }
                    ],
                )
                if new_cands:
                    candidate_id = new_cands[0].get("id")
                    logger.info(f"Created new candidate anchor: {candidate_id}")
        except Exception as e:
            logger.warning(f"Candidate table operation error: {e}")

        # 4. Register or Update Affidavit record in Supabase
        affidavit_id: Optional[str] = None
        if candidate_id:
            try:
                existing_affidavits = await supabase.select(
                    "affidavits",
                    {"candidate_id": f"eq.{candidate_id}", "filing_year": f"eq.{filing_year}"},
                )
                if existing_affidavits:
                    affidavit_id = existing_affidavits[0].get("id")
                    await supabase.update(
                        "affidavits",
                        {
                            "sha256_hash": sha256_hash,
                            "r2_storage_key": r2_key,
                            "raw_payload": None,
                        },
                        {"id": f"eq.{affidavit_id}"},
                    )
                    logger.info(f"Updated existing candidate affidavit {affidavit_id} with new filing: {r2_key}")
                else:
                    new_affidavit = await supabase.insert(
                        "affidavits",
                        [
                            {
                                "candidate_id": candidate_id,
                                "filing_year": filing_year,
                                "source_url": pdf_url,
                                "sha256_hash": sha256_hash,
                                "r2_storage_key": r2_key,
                            }
                        ],
                    )
                    if new_affidavit:
                        affidavit_id = new_affidavit[0].get("id")
                        logger.info(f"Registered new affidavit in Supabase: {affidavit_id}")
            except Exception as e:
                logger.warning(f"Affidavit table registration error: {e}")

        return {
            "candidate_name": candidate_name,
            "constituency": constituency,
            "state": state,
            "sha256_hash": sha256_hash,
            "r2_storage_key": r2_key,
            "pdf_bytes_len": len(pdf_bytes),
            "candidate_id": candidate_id,
            "affidavit_id": affidavit_id,
        }

    async def ingest_batch(self, nominations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ingests a batch of candidate nominations."""
        results = []
        for item in nominations:
            res = await self.process_candidate_nomination(
                candidate_name=item["name"],
                state=item["state"],
                constituency=item["constituency"],
                filing_year=item.get("filing_year", 2024),
                house=item.get("house", "Lok Sabha"),
                party=item.get("party"),
                pdf_url=item["pdf_url"],
            )
            if res:
                results.append(res)
        return results


eci_scraper = ECIAffidavitScraper()

if __name__ == "__main__":
    import asyncio

    target_state = (os.getenv("TARGET_STATE") or "Uttar Pradesh").strip()
    constituency_no = int(os.getenv("CONSTITUENCY_NO", "77")) # e.g. 77 for Varanasi

    logger.info("==========================================================")
    logger.info(f"Starting Dynamic ECI Candidate Affidavit Ingestion ({target_state})")
    logger.info("==========================================================")

    async def main():
        discovered = await eci_scraper.discover_constituency_candidates(
            state_name=target_state,
            constituency_no=constituency_no,
        )
        if discovered:
            results = await eci_scraper.ingest_batch(discovered)
            logger.info(f"✅ Ingestion Complete! Successfully indexed {len(results)} verified affidavits.")
        else:
            logger.info("No candidates discovered from live portal feed for current parameters.")

    try:
        asyncio.run(main())
    except Exception as e:
        import traceback
        logger.error(f"ECI affidavit ingestion encountered an error: {e}")
        traceback.print_exc()
        sys.exit(1)
