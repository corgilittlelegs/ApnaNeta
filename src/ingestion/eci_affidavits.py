import os
import sys
import io
import hashlib
import logging
import re
import ipaddress
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.r2_client import r2_storage
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ECIAffidavitIngest")

# Base URLs for ECI Affidavit Portal
ECI_AFFIDAVIT_BASE = "https://affidavit.eci.gov.in"
ECI_FILTER_ENDPOINT = f"{ECI_AFFIDAVIT_BASE}/CandidateCustomFilter"

# Allowed domains for PDF ingestion to prevent SSRF (SEC-05)
ALLOWED_DOMAINS = {
    "affidavit.eci.gov.in",
    "eci.gov.in",
    "affidavitresults.eci.gov.in",
    "suvidha.eci.gov.in",
}


def is_allowed_pdf_url(url: str) -> bool:
    """
    Defensive SSRF validation (SEC-05).
    Ensures URL targets official ECI government portals and rejects loopback/private/metadata IP addresses.
    """
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False

        # Reject direct IP addresses (prevent accessing internal VPC, 169.254.169.254, 127.0.0.1, etc.)
        try:
            ip = ipaddress.ip_address(hostname)
            return False  # Reject direct IPs, require verified domain
        except ValueError:
            pass

        # Check against allowed domains
        for allowed in ALLOWED_DOMAINS:
            if hostname == allowed or hostname.endswith(f".{allowed}"):
                return True
        return False
    except Exception:
        return False

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
    "Jharkhand": "S27",
    "Chhattisgarh": "S26",
    "Telangana": "S29",
    "Jammu and Kashmir": "U08",
    "Puducherry": "U07",
}

# Number of Assembly Constituencies (Vidhan Sabha seats) by State
STATE_ASSEMBLY_SEATS: Dict[str, int] = {
    "Andhra Pradesh": 175,
    "Arunachal Pradesh": 60,
    "Assam": 126,
    "Bihar": 243,
    "Chhattisgarh": 90,
    "Delhi": 70,
    "Goa": 40,
    "Gujarat": 182,
    "Haryana": 90,
    "Himachal Pradesh": 68,
    "Jammu and Kashmir": 90,
    "Jharkhand": 81,
    "Karnataka": 224,
    "Kerala": 140,
    "Madhya Pradesh": 230,
    "Maharashtra": 288,
    "Manipur": 60,
    "Meghalaya": 60,
    "Mizoram": 40,
    "Nagaland": 60,
    "Odisha": 147,
    "Puducherry": 30,
    "Punjab": 117,
    "Rajasthan": 200,
    "Sikkim": 32,
    "Tamil Nadu": 234,
    "Telangana": 119,
    "Tripura": 60,
    "Uttar Pradesh": 403,
    "Uttarakhand": 70,
    "West Bengal": 294,
}

# Number of Parliamentary Constituencies (Lok Sabha seats) by State
STATE_LOK_SABHA_SEATS: Dict[str, int] = {
    "Uttar Pradesh": 80,
    "Maharashtra": 48,
    "West Bengal": 42,
    "Bihar": 40,
    "Tamil Nadu": 39,
    "Madhya Pradesh": 29,
    "Karnataka": 28,
    "Gujarat": 26,
    "Andhra Pradesh": 25,
    "Rajasthan": 25,
    "Odisha": 21,
    "Kerala": 20,
    "Telangana": 17,
    "Assam": 14,
    "Jharkhand": 14,
    "Punjab": 13,
    "Chhattisgarh": 11,
    "Haryana": 10,
    "Delhi": 7,
    "Jammu and Kashmir": 5,
    "Uttarakhand": 5,
    "Himachal Pradesh": 4,
    "Tripura": 2,
    "Arunachal Pradesh": 2,
    "Goa": 2,
    "Manipur": 2,
    "Meghalaya": 2,
    "Mizoram": 1,
    "Nagaland": 1,
    "Sikkim": 1,
    "Puducherry": 1,
}


def parse_constituency_list(
    raw_input: str,
    target_state: str,
    house: str,
    max_limit: int = 0,
) -> List[int]:
    """
    Parses 'all', '1-50', '201, 202', or single numbers into a list of constituency IDs.
    """
    cleaned = (raw_input or "").strip().lower()
    if not cleaned or cleaned in ("all", "*", "0"):
        if house == "Vidhan Sabha":
            total = STATE_ASSEMBLY_SEATS.get(target_state, 100)
        else:
            total = STATE_LOK_SABHA_SEATS.get(target_state, 80 if target_state != "National" else 543)
        c_list = list(range(1, total + 1))
    elif "-" in cleaned:
        parts = cleaned.split("-")
        start = int(parts[0].strip())
        end = int(parts[1].strip())
        c_list = list(range(start, end + 1))
    elif "," in cleaned:
        c_list = [int(x.strip()) for x in cleaned.split(",") if x.strip().isdigit()]
    else:
        try:
            c_list = [int(cleaned)]
        except ValueError:
            c_list = [1]

    if max_limit > 0:
        c_list = c_list[:max_limit]
    return c_list


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
        if not is_allowed_pdf_url(pdf_url):
            logger.warning(f"Rejected disallowed or potentially malicious PDF download URL (SSRF Protection): {pdf_url}")
            return None

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
        house: Optional[str] = None,
        constituency_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Dynamically queries the official ECI CandidateCustomFilter endpoint
        for a given state and constituency to extract real candidate nominations and PDF links.
        Supports both Parliamentary (Lok Sabha) and Assembly (Vidhan Sabha) election cycles.
        """
        resolved_house = house or ("Vidhan Sabha" if ("AC" in election_type.upper() or "VIDHAN" in election_type.upper()) else "Lok Sabha")
        state_code = ECI_STATE_CODES.get(state_name, "U07")
        params = {
            "electionType": election_type,
            "state": state_code,
            "constituency": str(constituency_no),
        }
        url = f"{ECI_FILTER_ENDPOINT}?electionType={election_type}&state={state_code}&constituency={constituency_no}"
        logger.info(f"Querying ECI dynamic nomination feed ({resolved_house}): {url}")

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
            resolved_constituency = constituency_name or f"Constituency {constituency_no}"
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
                            "constituency": resolved_constituency,
                            "house": resolved_house,
                            "filing_year": 2024,
                            "pdf_url": pdf_link,
                        })
            logger.info(f"Discovered {len(nominations)} candidate nomination(s) for {resolved_house} from ECI feed.")
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

    target_state = (os.getenv("TARGET_STATE") or "Maharashtra").strip()
    raw_constituency = (os.getenv("CONSTITUENCY_NO") or "all").strip()
    constituency_name = (os.getenv("CONSTITUENCY_NAME") or "").strip() or None
    election_type = (os.getenv("ELECTION_TYPE") or "24-AC-GENERAL-1-2024").strip()
    max_limit = int(os.getenv("MAX_CONSTITUENCIES", "0"))

    raw_house = (os.getenv("HOUSE") or "Vidhan Sabha").strip()
    if raw_house.lower() in ("all", "all houses", "*"):
        house = "Vidhan Sabha" if ("AC" in election_type.upper() or "VIDHAN" in election_type.upper()) else "Lok Sabha"
    elif raw_house:
        house = raw_house
    elif "AC" in election_type.upper() or "VIDHAN" in election_type.upper():
        house = "Vidhan Sabha"
    else:
        house = "Lok Sabha"

    constituency_list = parse_constituency_list(
        raw_input=raw_constituency,
        target_state=target_state,
        house=house,
        max_limit=max_limit,
    )

    logger.info("==========================================================")
    logger.info(f"Starting Dynamic ECI Candidate Affidavit Ingestion")
    logger.info(f"House:                  {house}")
    logger.info(f"Election Type:          {election_type}")
    logger.info(f"Target State:           {target_state}")
    logger.info(f"Constituencies Scope:   {raw_constituency} ({len(constituency_list)} total)")
    if constituency_name and len(constituency_list) == 1:
        logger.info(f"Constituency Name:      {constituency_name}")
    logger.info("==========================================================")

    async def main():
        total_indexed = 0
        total_candidates_discovered = 0

        for idx, c_no in enumerate(constituency_list, 1):
            c_name = constituency_name if len(constituency_list) == 1 else None
            logger.info(f"[{idx}/{len(constituency_list)}] Querying constituency #{c_no} in {target_state}...")
            
            discovered = await eci_scraper.discover_constituency_candidates(
                election_type=election_type,
                state_name=target_state,
                constituency_no=c_no,
                house=house,
                constituency_name=c_name,
            )
            
            if discovered:
                total_candidates_discovered += len(discovered)
                results = await eci_scraper.ingest_batch(discovered)
                total_indexed += len(results)
                logger.info(f"  ✓ Indexed {len(results)} candidate affidavit(s) for constituency #{c_no}.")
            else:
                logger.info(f"  - No candidates returned from feed for constituency #{c_no}.")

        logger.info("==========================================================")
        logger.info(f"✅ Ingestion Run Finished!")
        logger.info(f"Constituencies Scanned: {len(constituency_list)}")
        logger.info(f"Candidates Discovered:  {total_candidates_discovered}")
        logger.info(f"Affidavits Processed:   {total_indexed}")
        logger.info("==========================================================")

    try:
        asyncio.run(main())
    except Exception as e:
        import traceback
        logger.error(f"ECI affidavit ingestion encountered an error: {e}")
        traceback.print_exc()
        sys.exit(1)
