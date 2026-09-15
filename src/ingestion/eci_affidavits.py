import hashlib
import logging
from typing import List, Dict, Any, Optional
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.r2_client import r2_storage
from src.storage.supabase_client import supabase

logger = logging.getLogger(__name__)

# Base URLs for ECI Affidavit Portal
ECI_AFFIDAVIT_BASE = "https://affidavit.eci.gov.in"


class ECIAffidavitScraper:
    """
    Bot-resilient scraper for the Election Commission of India (ECI) affidavit portal.
    Uses browser TLS/JA3 impersonation to prevent bot blocks and paces requests politely.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=1.5, max_delay=3.5)

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
        logger.info(f"Fetching affidavit PDF: {pdf_url}")

        try:
            session = self._get_client()
            response = session.get(pdf_url, timeout=30)
            if response.status_code == 200 and len(response.content) > 1000:
                return response.content
            logger.warning(f"Unexpected status code {response.status_code} for {pdf_url}")
            return None
        except Exception as e:
            logger.error(f"Error downloading affidavit from {pdf_url}: {e}")
            return None

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
        1. Downloads the affidavit PDF.
        2. Computes SHA-256 fingerprint.
        3. Uploads PDF to Cloudflare R2.
        4. Registers candidate & affidavit metadata in Supabase.
        """
        pdf_bytes = await self.fetch_pdf(pdf_url)
        if not pdf_bytes:
            return None

        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
        logger.info(f"Verified PDF hash for {candidate_name}: {sha256_hash}")

        # 1. Upload immutable copy to Cloudflare R2
        r2_key = r2_storage.upload_affidavit_pdf(pdf_bytes, sha256_hash=sha256_hash)

        # 2. Register Candidate in Supabase
        candidate_records = await supabase.insert(
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

        candidate_id = candidate_records[0]["id"] if candidate_records else None

        # 3. Register Affidavit record in Supabase
        if candidate_id:
            await supabase.insert(
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

        return {
            "candidate_name": candidate_name,
            "constituency": constituency,
            "state": state,
            "sha256_hash": sha256_hash,
            "r2_storage_key": r2_key,
            "pdf_bytes_len": len(pdf_bytes),
        }


eci_scraper = ECIAffidavitScraper()

if __name__ == "__main__":
    import os
    import sys

    target_state = os.getenv("TARGET_STATE") or (sys.argv[1] if len(sys.argv) > 1 else "National")
    logger.info(f"Starting ECI affidavit runner for scope: {target_state}")
    print(f"ECI Affidavit Scraper initialized and ready for state: {target_state}")
