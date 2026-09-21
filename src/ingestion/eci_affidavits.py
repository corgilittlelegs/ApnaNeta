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
    "Uttar Pradesh": "S24",
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


# Master registry of ECI State Assembly Election Cycles (AC-GENERAL)
STATE_ASSEMBLY_ELECTIONS: Dict[str, str] = {
    "Maharashtra": "24-AC-GENERAL-1-2024",
    "Jharkhand": "24-AC-GENERAL-2-2024",
    "Haryana": "24-AC-GENERAL-3-2024",
    "Jammu and Kashmir": "24-AC-GENERAL-4-2024",
    "Andhra Pradesh": "24-AC-GENERAL-5-2024",
    "Odisha": "24-AC-GENERAL-6-2024",
    "Arunachal Pradesh": "24-AC-GENERAL-7-2024",
    "Sikkim": "24-AC-GENERAL-8-2024",
    "Karnataka": "23-AC-GENERAL-1-2023",
    "Madhya Pradesh": "23-AC-GENERAL-2-2023",
    "Rajasthan": "23-AC-GENERAL-3-2023",
    "Chhattisgarh": "23-AC-GENERAL-4-2023",
    "Telangana": "23-AC-GENERAL-5-2023",
    "Gujarat": "22-AC-GENERAL-1-2022",
    "Himachal Pradesh": "22-AC-GENERAL-2-2022",
    "Uttar Pradesh": "22-AC-GENERAL-1-2022",
    "Punjab": "22-AC-GENERAL-2-2022",
    "Uttarakhand": "22-AC-GENERAL-3-2022",
    "Goa": "22-AC-GENERAL-4-2022",
    "Manipur": "22-AC-GENERAL-5-2022",
    "West Bengal": "21-AC-GENERAL-1-2021",
    "Tamil Nadu": "21-AC-GENERAL-2-2021",
    "Kerala": "21-AC-GENERAL-3-2021",
    "Assam": "21-AC-GENERAL-4-2021",
    "Tripura": "23-AC-GENERAL-1-2023",
    "Meghalaya": "23-AC-GENERAL-2-2023",
    "Nagaland": "23-AC-GENERAL-3-2023",
    "Mizoram": "23-AC-GENERAL-4-2023",
    "Puducherry": "21-AC-GENERAL-1-2021",
    "Delhi": "20-AC-GENERAL-1-2020",
    "Bihar": "20-AC-GENERAL-1-2020",
}

# Regional clusters for daily rotation (prevents exceeding GitHub Actions timeouts)
REGIONAL_STATE_CLUSTERS: Dict[str, List[str]] = {
    "NORTH": [
        "Delhi",
        "Uttar Pradesh",
        "Punjab",
        "Haryana",
        "Himachal Pradesh",
        "Jammu and Kashmir",
        "Uttarakhand",
    ],
    "WEST": [
        "Maharashtra",
        "Gujarat",
        "Rajasthan",
        "Goa",
    ],
    "SOUTH": [
        "Karnataka",
        "Tamil Nadu",
        "Kerala",
        "Andhra Pradesh",
        "Telangana",
        "Puducherry",
    ],
    "EAST_CENTRAL": [
        "West Bengal",
        "Bihar",
        "Odisha",
        "Jharkhand",
        "Madhya Pradesh",
        "Chhattisgarh",
    ],
    "NORTHEAST": [
        "Assam",
        "Arunachal Pradesh",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Sikkim",
        "Tripura",
    ],
}

# Day-of-week regional assignment (UTC weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri)
WEEKDAY_REGIONS: Dict[int, str] = {
    0: "NORTH",        # Monday
    1: "WEST",         # Tuesday
    2: "SOUTH",        # Wednesday
    3: "EAST_CENTRAL", # Thursday
    4: "NORTHEAST",    # Friday
    5: "WEST",         # Saturday fallback
    6: "NORTH",        # Sunday fallback
}

# Major recognized parties for sitting MLA / winner prioritization
MAJOR_PARTY_KEYWORDS = [
    "bharatiya janata party", "bjp",
    "nationalist congress party", "ncp",
    "indian national congress", "inc",
    "shiv sena",
    "aam aadmi party", "aap",
    "samajwadi party", "sp",
    "all india trinamool congress", "tmc",
    "dravida munnetra kazhagam", "dmk",
    "all india anna dravida munnetra kazhagam", "aiadmk",
    "telugu desam party", "tdp",
    "ysr congress party", "ysrcp",
    "janata dal", "jdu", "jds",
    "communist party of india", "cpi",
    "rashtriya janata dal", "rjd",
    "rashtriya lok dal", "rld",
    "lok janshakti party", "ljp",
    "jharkhand mukti morcha", "jmm",
    "bharat rashtra samithi", "brs",
    "biju janata dal", "bjd",
]


def candidate_priority_score(name: str, party: str) -> int:
    """
    Ranks sitting MLAs, prominent leaders, and recognized major party nominees
    above fringe independent candidates to keep ingestion high-signal and fast.
    """
    p_lower = (party or "").lower()
    n_lower = (name or "").lower()

    if any(prom in n_lower for prom in ("ajit", "fadnavis", "shinde", "yogi", "kejriwal", "stalin", "mamata", "soren")):
        return 100

    for idx, kw in enumerate(MAJOR_PARTY_KEYWORDS):
        if kw in p_lower:
            return 80 - idx

    if "independent" in p_lower or "ind" in p_lower:
        return 1
    return 10


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

            if nominations:
                # Rank sitting MLAs, prominent leaders, and recognized major parties first
                nominations.sort(
                    key=lambda c: candidate_priority_score(c["name"], c.get("party", "")),
                    reverse=True,
                )
                max_nominees = int(os.getenv("MAX_CANDIDATES_PER_AC", "2"))
                if max_nominees > 0 and len(nominations) > max_nominees:
                    logger.info(
                        f"Prioritizing top {max_nominees} major nominees for {state_name} AC #{constituency_no} (filtered {len(nominations) - max_nominees} fringe filings)"
                    )
                    nominations = nominations[:max_nominees]

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
        Processes a discovered candidate nomination by downloading Form 26,
        uploading to Cloudflare R2, registering in Supabase, and preparing for Gemini VLM audit.
        """
        # Step 1: Download PDF
        pdf_bytes = await self.fetch_pdf(pdf_url)
        if not pdf_bytes:
            logger.warning(f"Could not retrieve PDF for candidate: {candidate_name} ({pdf_url})")
            return None

        # Step 2: Compute SHA256 Hash
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Step 3: Check Deduplication in Supabase
        existing = await supabase.select(
            "affidavits",
            columns="id, r2_storage_key",
            eq={"sha256_hash": sha256_hash},
        )
        if existing:
            logger.info(f"Affidavit already indexed in Supabase (Deduplicated): {sha256_hash}")
            return {
                "candidate_name": candidate_name,
                "constituency": constituency,
                "state": state,
                "sha256_hash": sha256_hash,
                "r2_storage_key": existing[0]["r2_storage_key"],
                "deduplicated": True,
            }

        # Step 4: Ephemeral In-Memory Storage Strategy (Zero Permanent R2 Storage)
        # We do NOT upload multi-megabyte PDFs to Cloudflare R2.
        # This keeps the pipeline free, prevents hitting storage quotas, and stays within limits.
        # Primary source verification is preserved via sha256_hash and official source_url.
        r2_key = None

        # Step 5: Upsert Candidate in Supabase
        candidate_id = None
        cand_records = await supabase.select(
            "candidates",
            {
                "select": "id",
                "name": f"ilike.{candidate_name.strip()}",
                "house": f"eq.{house}",
                "limit": "1",
            },
        )
        if cand_records:
            candidate_id = cand_records[0]["id"]
            logger.info(f"Matched existing candidate in Supabase: {candidate_name} ({candidate_id})")
        else:
            try:
                new_cand = await supabase.insert(
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
                if new_cand:
                    candidate_id = new_cand[0].get("id")
                    logger.info(f"Registered new candidate in Supabase: {candidate_name} ({candidate_id})")
            except Exception as e:
                logger.warning(f"Candidate table upsert error: {e}")

        # Step 6: Register Affidavit Record (Direct link to official ECI portal + SHA-256 hash)
        affidavit_id = None
        if candidate_id:
            try:
                aff_existing = await supabase.select(
                    "affidavits",
                    {
                        "select": "id",
                        "candidate_id": f"eq.{candidate_id}",
                        "filing_year": f"eq.{filing_year}",
                        "limit": "1",
                    },
                )
                if aff_existing:
                    affidavit_id = aff_existing[0]["id"]
                    await supabase.update(
                        "affidavits",
                        {
                            "source_url": pdf_url,
                            "sha256_hash": sha256_hash,
                            "r2_storage_key": None,
                        },
                        {"id": f"eq.{affidavit_id}"},
                    )
                    logger.info(f"Updated existing candidate affidavit {affidavit_id} with verified ECI filing: {pdf_url}")
                else:
                    new_affidavit = await supabase.insert(
                        "affidavits",
                        [
                            {
                                "candidate_id": candidate_id,
                                "filing_year": filing_year,
                                "source_url": pdf_url,
                                "sha256_hash": sha256_hash,
                                "r2_storage_key": None,
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
            "r2_storage_key": None,
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
                house=item.get("house", "Vidhan Sabha"),
                party=item.get("party"),
                pdf_url=item["pdf_url"],
            )
            if res:
                results.append(res)
        return results


eci_scraper = ECIAffidavitScraper()

if __name__ == "__main__":
    import asyncio
    import datetime

    raw_region = (os.getenv("REGION") or "AUTO_BY_DAY").strip().upper()
    raw_state = (os.getenv("TARGET_STATE") or "ALL").strip()
    raw_constituency = (os.getenv("CONSTITUENCY_NO") or "all").strip()
    constituency_name = (os.getenv("CONSTITUENCY_NAME") or "").strip() or None
    explicit_election = (os.getenv("ELECTION_TYPE") or "").strip()
    batch_limit = int(os.getenv("BATCH_LIMIT", os.getenv("MAX_CONSTITUENCIES", "0")))

    # Resolve active region and states
    if raw_state.upper() not in ("ALL", "NATIONAL", "*", ""):
        states_to_run = [raw_state]
        resolved_region = f"MANUAL_STATE ({raw_state})"
    else:
        if raw_region in ("AUTO_BY_DAY", "AUTO", "TODAY"):
            # UTC day of week: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
            current_weekday = datetime.datetime.now(datetime.timezone.utc).weekday()
            resolved_region = WEEKDAY_REGIONS.get(current_weekday, "WEST")
            logger.info(f"Resolved AUTO_BY_DAY for weekday {current_weekday} -> {resolved_region}")
        else:
            resolved_region = raw_region

        if resolved_region == "ALL":
            states_to_run = list(STATE_ASSEMBLY_ELECTIONS.keys())
        elif resolved_region in REGIONAL_STATE_CLUSTERS:
            candidate_states = REGIONAL_STATE_CLUSTERS[resolved_region]
            states_to_run = [s for s in candidate_states if s in STATE_ASSEMBLY_ELECTIONS]
        else:
            logger.warning(f"Unrecognized region '{raw_region}'. Defaulting to WEST cluster.")
            resolved_region = "WEST"
            states_to_run = [s for s in REGIONAL_STATE_CLUSTERS["WEST"] if s in STATE_ASSEMBLY_ELECTIONS]

    logger.info("==========================================================")
    logger.info("🇮🇳 APNA NETA: ZERO-INPUT AUTOMATED VIDHAN SABHA INGESTION")
    logger.info(f"Active Schedule Region: {resolved_region}")
    logger.info(f"Total States Scope:     {len(states_to_run)} state(s): {', '.join(states_to_run)}")
    logger.info(f"Constituencies Scope:   {raw_constituency}")
    logger.info(f"Batch Limit per State:  {batch_limit if batch_limit > 0 else 'All Constituencies'}")
    logger.info(f"Storage Architecture:   Ephemeral In-Memory (Zero R2 Uploads, Direct ECI URL + SHA-256)")
    logger.info("==========================================================")

    async def main():
        grand_total_indexed = 0
        grand_total_discovered = 0

        for s_idx, state_name in enumerate(states_to_run, 1):
            election_code = (
                explicit_election
                if (explicit_election and len(states_to_run) == 1)
                else STATE_ASSEMBLY_ELECTIONS.get(state_name, "24-AC-GENERAL-1-2024")
            )
            
            c_list = parse_constituency_list(
                raw_input=raw_constituency,
                target_state=state_name,
                house="Vidhan Sabha",
                max_limit=batch_limit,
            )

            logger.info(f"\n>>> [{s_idx}/{len(states_to_run)}] PROCESSING STATE: {state_name.upper()} ({len(c_list)} constituencies, Election: {election_code})")

            for c_idx, c_no in enumerate(c_list, 1):
                c_label = constituency_name if (len(c_list) == 1 and len(states_to_run) == 1) else None
                logger.info(f"  [{c_idx}/{len(c_list)}] Fetching {state_name} AC #{c_no}...")
                
                discovered = await eci_scraper.discover_constituency_candidates(
                    election_type=election_code,
                    state_name=state_name,
                    constituency_no=c_no,
                    house="Vidhan Sabha",
                    constituency_name=c_label,
                )
                
                if discovered:
                    grand_total_discovered += len(discovered)
                    results = await eci_scraper.ingest_batch(discovered)
                    grand_total_indexed += len(results)
                    logger.info(f"    ✓ Indexed {len(results)} candidate(s) for {state_name} AC #{c_no}.")
                else:
                    logger.info(f"    - No nominations in feed for {state_name} AC #{c_no}.")

        logger.info("\n==========================================================")
        logger.info(f"✅ ALL VIDHAN SABHA INGESTION COMPLETE!")
        logger.info(f"Total States Processed:     {len(states_to_run)}")
        logger.info(f"Total Candidates Discovered: {grand_total_discovered}")
        logger.info(f"Total Affidavits Indexed:   {grand_total_indexed}")
        logger.info("==========================================================")

    try:
        asyncio.run(main())
    except Exception as e:
        import traceback
        logger.error(f"ECI affidavit ingestion encountered an error: {e}")
        traceback.print_exc()
        sys.exit(1)
