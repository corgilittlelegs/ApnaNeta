import os
import sys
import hashlib
import logging
import asyncio
from typing import List, Dict, Any, Optional
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.r2_client import r2_storage
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ECIPlaywrightCrawler")

ECI_PORTAL_URL = "https://affidavit.eci.gov.in"
DEFAULT_ELECTION_TYPE = "24-PC-GENERAL-1-2024"

# Official ECI State Codes
ECI_STATE_CODES = {
    "Andhra Pradesh": "S01", "Arunachal Pradesh": "S02", "Assam": "S03",
    "Bihar": "S04", "Goa": "S05", "Gujarat": "S06", "Haryana": "S07",
    "Himachal Pradesh": "S08", "Karnataka": "S10", "Kerala": "S11",
    "Madhya Pradesh": "S12", "Maharashtra": "S13", "Manipur": "S14",
    "Meghalaya": "S15", "Mizoram": "S16", "Nagaland": "S17",
    "Odisha": "S18", "Punjab": "S19", "Rajasthan": "S20",
    "Sikkim": "S21", "Tamil Nadu": "S22", "Tripura": "S23",
    "Uttar Pradesh": "U07", "Uttarakhand": "S28", "West Bengal": "S25",
    "Delhi": "U05"
}


class ECIPlaywrightCrawler:
    """
    Automated Headless Browser crawler for the Election Commission of India (ECI) portal.
    Automates JavaScript cascading dropdowns (Election -> State -> Constituency) to discover
    all nominated candidates and download official Form 26 electoral affidavits.
    Features automated browser execution with fallback to TLS impersonation HTTP sessions.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=1.5, max_delay=3.0)

    async def crawl_constituency_playwright(
        self,
        state_name: str,
        constituency_no: int,
        election_type: str = DEFAULT_ELECTION_TYPE,
        headless: bool = True,
        house: Optional[str] = None,
        constituency_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes a headless Chromium session to navigate the dynamic ECI form cascade.
        Supports both Lok Sabha and Vidhan Sabha (State Assembly) elections.
        """
        resolved_house = house or ("Vidhan Sabha" if ("AC" in election_type.upper() or "VIDHAN" in election_type.upper()) else "Lok Sabha")
        resolved_constituency = constituency_name or f"Constituency {constituency_no}"
        logger.info(f"Launching Playwright Chromium for {state_name} ({resolved_house}) - {resolved_constituency}...")
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.warning("playwright package not installed. Falling back to dynamic HTTP session.")
            return await self.crawl_constituency_http_fallback(state_name, constituency_no, election_type, resolved_house, resolved_constituency)

        nominations = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=headless)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                    viewport={"width": 1280, "height": 800},
                )
                page = await context.new_page()

                target_url = f"{ECI_PORTAL_URL}/CandidateCustomFilter?electionType={election_type}&state={ECI_STATE_CODES.get(state_name, 'U07')}&constituency={constituency_no}"
                logger.info(f"Navigating to ECI filter page: {target_url}")
                await page.goto(target_url, timeout=35000, wait_until="domcontentloaded")

                # Wait for candidate table or empty results indicator
                try:
                    await page.wait_for_selector("table", timeout=10000)
                except Exception:
                    logger.info("Table element not rendered within timeout.")

                # Extract candidate rows
                rows = await page.query_selector_all("table tbody tr")
                for row in rows:
                    cells = await row.query_selector_all("td")
                    if len(cells) >= 4:
                        name_text = (await cells[1].inner_text()).strip()
                        party_text = (await cells[2].inner_text()).strip()

                        # Extract PDF link
                        links = await row.query_selector_all("a")
                        pdf_url = None
                        for link in links:
                            href = await link.get_attribute("href")
                            if href and (".pdf" in href.lower() or "download" in href.lower() or "affidavit" in href.lower()):
                                pdf_url = href if href.startswith("http") else f"{ECI_PORTAL_URL}/{href.lstrip('/')}"
                                break

                        if name_text and pdf_url:
                            nominations.append({
                                "name": name_text,
                                "party": party_text,
                                "state": state_name,
                                "constituency": resolved_constituency,
                                "house": resolved_house,
                                "filing_year": 2024,
                                "pdf_url": pdf_url,
                            })

                await browser.close()
                logger.info(f"Playwright extracted {len(nominations)} nominations.")
                return nominations
        except Exception as e:
            logger.warning(f"Playwright execution encountered error ({e}). Using HTTP session fallback.")
            return await self.crawl_constituency_http_fallback(state_name, constituency_no, election_type, resolved_house, resolved_constituency)

    async def crawl_constituency_http_fallback(
        self,
        state_name: str,
        constituency_no: int,
        election_type: str = DEFAULT_ELECTION_TYPE,
        house: Optional[str] = None,
        constituency_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Direct HTTP session fallback with browser TLS impersonation.
        Supports both Lok Sabha and Vidhan Sabha.
        """
        resolved_house = house or ("Vidhan Sabha" if ("AC" in election_type.upper() or "VIDHAN" in election_type.upper()) else "Lok Sabha")
        resolved_constituency = constituency_name or f"Constituency {constituency_no}"
        state_code = ECI_STATE_CODES.get(state_name, "U07")
        url = f"{ECI_PORTAL_URL}/CandidateCustomFilter?electionType={election_type}&state={state_code}&constituency={constituency_no}"
        logger.info(f"Executing TLS-impersonated HTTP request to ({resolved_house}): {url}")

        try:
            from curl_cffi import requests as curl_requests
            session = curl_requests.Session(impersonate="chrome120")
            resp = session.get(url, timeout=25)
            html = resp.text if resp.status_code == 200 else ""
        except Exception:
            import httpx
            async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}, timeout=25.0) as client:
                resp = await client.get(url)
                html = resp.text if resp.status_code == 200 else ""

        if not html or len(html) < 500:
            return []

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        if not table:
            return []

        nominations = []
        for row in table.find_all("tr")[1:]:
            cols = row.find_all("td")
            if len(cols) >= 4:
                cand_name = cols[1].get_text(strip=True)
                party_name = cols[2].get_text(strip=True)
                pdf_link = None
                for a in row.find_all("a", href=True):
                    href = a["href"]
                    if ".pdf" in href.lower() or "download" in href.lower() or "affidavit" in href.lower():
                        pdf_link = href if href.startswith("http") else f"{ECI_PORTAL_URL}/{href.lstrip('/')}"
                        break
                if cand_name and pdf_link:
                    nominations.append({
                        "name": cand_name,
                        "party": party_name,
                        "state": state_name,
                        "constituency": resolved_constituency,
                        "house": resolved_house,
                        "filing_year": 2024,
                        "pdf_url": pdf_link,
                    })

        return nominations

    async def download_and_ingest_affidavit(self, nomination: Dict[str, Any]) -> Optional[str]:
        """
        Downloads the affidavit PDF, computes SHA256, stores in R2, and registers in Supabase.
        """
        pdf_url = nomination.get("pdf_url")
        if not pdf_url:
            return None

        await self.rate_limiter.wait()
        logger.info(f"Downloading affidavit PDF from: {pdf_url}")

        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                resp = await client.get(pdf_url)
                if resp.status_code != 200 or not resp.content.startswith(b"%PDF"):
                    logger.warning("Downloaded content is not a valid PDF.")
                    return None
                pdf_bytes = resp.content

            sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
            r2_key = f"affidavits/{sha256_hash}.pdf"
            r2_storage.upload_affidavit_pdf(r2_key, pdf_bytes)

            # Ensure candidate exists in Supabase
            cand_name = nomination["name"].strip()
            matched = await supabase.select("candidates", {"name": f"ilike.{cand_name}", "limit": "1"})
            if matched:
                cand_id = matched[0]["id"]
            else:
                inserted = await supabase.insert("candidates", [{
                    "name": cand_name,
                    "state": nomination["state"],
                    "constituency": nomination["constituency"],
                    "house": nomination["house"],
                    "party": nomination.get("party"),
                }])
                cand_id = inserted[0]["id"] if inserted else None

            if cand_id:
                affidavit_record = {
                    "candidate_id": cand_id,
                    "filing_year": nomination["filing_year"],
                    "source_url": pdf_url,
                    "sha256_hash": sha256_hash,
                    "r2_storage_key": r2_key,
                }
                await supabase.upsert("affidavits", [affidavit_record], on_conflict="sha256_hash")
                logger.info(f"✅ Ingested affidavit {sha256_hash[:10]} for {cand_name}")
                return sha256_hash

        except Exception as e:
            logger.error(f"Failed to download and ingest affidavit ({pdf_url}): {e}")

        return None


eci_crawler = ECIPlaywrightCrawler()
