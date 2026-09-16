import csv
import io
import os
import sys
import logging
from typing import List, Dict, Any, Optional
import httpx
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SansadSync")

# Verified PRS India Parliamentary Activity Datasets (Public Domain & Accurate)
PRS_LS_18TH_URL = "https://raw.githubusercontent.com/Vonter/india-representatives-activity/main/csv/Lok%20Sabha/18th.csv"
PRS_LS_17TH_URL = "https://raw.githubusercontent.com/Vonter/india-representatives-activity/main/csv/Lok%20Sabha/17th.csv"

# Official Digital Sansad Base
SANSAD_BASE = "https://sansad.in"
API_LS_MEMBERS = f"{SANSAD_BASE}/api_ls/member"
API_RS_MEMBERS = f"{SANSAD_BASE}/api_rs/member"


def parse_date(d_str: str) -> Optional[str]:
    """Converts DD-MM-YYYY to YYYY-MM-DD for PostgreSQL DATE column."""
    if not d_str or d_str.strip().lower() in ("in office", "none", "", "null"):
        return None
    try:
        parts = d_str.strip().split("-")
        if len(parts) == 3 and len(parts[2]) == 4:
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    except Exception:
        pass
    return None


def parse_attendance(att_str: str) -> float:
    """Parses '85.00%' into float 85.0."""
    if not att_str:
        return 0.0
    cleaned = str(att_str).replace("%", "").strip()
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return 0.0


def parse_int(val: Any) -> int:
    """Safely converts numeric or string values into integers."""
    if not val:
        return 0
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return 0


def normalize_name(name: str) -> str:
    """Normalizes candidate names for fuzzy index matching."""
    cleaned = "".join(c.lower() for c in name if c.isalnum() or c.isspace())
    return " ".join(cleaned.split())


class SansadScraper:
    """
    Continuous governance tracker for Indian Parliament (Lok Sabha & Rajya Sabha).
    Synchronizes attendance records, questions asked, debates, and private member bills
    directly into Supabase sansad_records linked with longitudinal candidate profiles.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=0.5, max_delay=1.5)

    async def fetch_existing_candidates_index(self) -> Dict[str, Dict[str, Any]]:
        """
        Loads all candidates from Supabase into an in-memory lookup index by normalized name.
        """
        logger.info("Fetching existing candidates index from Supabase...")
        try:
            records = await supabase.select(
                "candidates",
                {"select": "id,name,state,constituency,party", "limit": "10000"}
            )
            index: Dict[str, Dict[str, Any]] = {}
            for row in records:
                norm = normalize_name(row.get("name", ""))
                if norm:
                    index[norm] = row
            logger.info(f"Loaded {len(index)} indexed candidates from Supabase.")
            return index
        except Exception as e:
            logger.warning(f"Could not load candidates index: {e}. Will create candidates dynamically.")
            return {}

    async def sync_from_prs_activity(self, url: str, house_label: str = "Lok Sabha") -> int:
        """
        Streams official PRS MP track data and populates sansad_records & candidate profiles.
        """
        logger.info(f"Fetching parliamentary activity from: {url}")
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            csv_text = resp.text

        reader = csv.DictReader(io.StringIO(csv_text), delimiter=";")
        candidates_index = await self.fetch_existing_candidates_index()

        sansad_batch: List[Dict[str, Any]] = []
        synced_count = 0
        updated_candidates = 0

        for row in reader:
            raw_name = (row.get("Name") or "").strip()
            if not raw_name:
                continue

            constituency = (row.get("Constituency") or "Parliament of India").strip()
            state = (row.get("State") or "India").strip()
            party = (row.get("Party") or "Independent").strip()
            attendance_pct = parse_attendance(row.get("Attendance", "0"))
            debates_cnt = parse_int(row.get("Debates", 0))
            questions_cnt = parse_int(row.get("Questions", 0))
            pmb_cnt = parse_int(row.get("Private Member Bills", 0))
            start_date = parse_date(row.get("Start of Term", ""))
            end_date = parse_date(row.get("End of Term", ""))

            norm = normalize_name(raw_name)
            candidate_id: Optional[str] = None

            # 1. Match against existing candidate
            if norm in candidates_index:
                matched_cand = candidates_index[norm]
                candidate_id = matched_cand.get("id")

                # Enrich candidate's constituency and party if previously generic
                if matched_cand.get("constituency") in ("Parliament of India", "India", None):
                    try:
                        await supabase.update(
                            "candidates",
                            {"state": state, "constituency": constituency, "party": party},
                            {"id": f"eq.{candidate_id}"}
                        )
                        updated_candidates += 1
                    except Exception as e:
                        logger.debug(f"Failed to update candidate {raw_name}: {e}")
            else:
                # 2. Candidate not yet in DB -> Create candidate anchor
                try:
                    new_candidate = {
                        "name": raw_name,
                        "state": state,
                        "constituency": constituency,
                        "house": house_label,
                        "party": party,
                    }
                    inserted = await supabase.insert("candidates", [new_candidate])
                    if inserted:
                        candidate_id = inserted[0].get("id")
                        candidates_index[norm] = inserted[0]
                except Exception as e:
                    logger.warning(f"Error creating candidate anchor for {raw_name}: {e}")

            # 3. Build sansad_records entry
            record: Dict[str, Any] = {
                "house": house_label,
                "attendance_rate": attendance_pct,
                "questions_count": questions_cnt,
                "debates_count": debates_cnt,
                "private_member_bills": pmb_cnt,
            }
            if candidate_id:
                record["candidate_id"] = candidate_id
            if start_date:
                record["tenure_start"] = start_date
            if end_date:
                record["tenure_end"] = end_date

            sansad_batch.append(record)

            if len(sansad_batch) >= 100:
                await supabase.insert("sansad_records", sansad_batch)
                synced_count += len(sansad_batch)
                logger.info(f"Inserted {synced_count} Sansad activity records...")
                sansad_batch.clear()

        if sansad_batch:
            await supabase.insert("sansad_records", sansad_batch)
            synced_count += len(sansad_batch)

        logger.info(
            f"✅ Successfully synchronized {synced_count} {house_label} activity records into Supabase! "
            f"(Enriched {updated_candidates} candidate profiles)"
        )
        return synced_count


sansad_scraper = SansadScraper()

if __name__ == "__main__":
    import asyncio

    target_term = os.getenv("TARGET_TERM", "18th").strip().lower()

    async def main():
        total = 0
        if target_term in ("18th", "all"):
            logger.info("Starting synchronization of 18th Lok Sabha (2024–Present)...")
            total += await sansad_scraper.sync_from_prs_activity(PRS_LS_18TH_URL, house_label="Lok Sabha")
        if target_term in ("17th", "all"):
            logger.info("Starting synchronization of 17th Lok Sabha (2019–2024)...")
            total += await sansad_scraper.sync_from_prs_activity(PRS_LS_17TH_URL, house_label="Lok Sabha")
        logger.info(f"All Sansad synchronization complete! Total records inserted: {total}")

    try:
        asyncio.run(main())
    except Exception as e:
        import traceback
        logger.error(f"Sansad sync encountered an error: {e}")
        traceback.print_exc()
        sys.exit(1)
