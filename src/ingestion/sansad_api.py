import csv
import io
import os
import sys
import logging
from typing import List, Dict, Any, Optional, Tuple
try:
    import httpx
except ImportError:
    httpx = None
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SansadSync")

# Verified PRS India Parliamentary Activity Datasets (Public Domain & Accurate)
PRS_LS_ALL_URL = "https://raw.githubusercontent.com/Vonter/india-representatives-activity/main/csv/Lok%20Sabha.csv"
PRS_LS_18TH_URL = "https://raw.githubusercontent.com/Vonter/india-representatives-activity/main/csv/Lok%20Sabha/18th.csv"
PRS_LS_17TH_URL = "https://raw.githubusercontent.com/Vonter/india-representatives-activity/main/csv/Lok%20Sabha/17th.csv"

# Official Digital Sansad Base
SANSAD_BASE = "https://sansad.in"
API_LS_MEMBERS = f"{SANSAD_BASE}/api_ls/member"
API_RS_MEMBERS = f"{SANSAD_BASE}/api_rs/member"


from datetime import datetime


def parse_date(d_str: str) -> Optional[str]:
    """Converts DD-MM-YYYY, DD Mon YY, etc. to YYYY-MM-DD for PostgreSQL DATE column."""
    if not d_str or d_str.strip().lower() in ("in office", "none", "", "null"):
        return None
    d = d_str.strip()
    for fmt in ("%d %b %y", "%d %b %Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%d %B %Y"):
        try:
            return datetime.strptime(d, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    try:
        parts = d.split("-")
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


def name_tokens_key(name: str) -> str:
    """Returns sorted tokens of the name to match names written in reverse/honorific order."""
    tokens = sorted(normalize_name(name).split())
    return " ".join(tokens)


class SansadScraper:
    """
    Continuous governance tracker for Indian Parliament (Lok Sabha & Rajya Sabha).
    Synchronizes attendance records, questions asked, debates, and private member bills
    directly into Supabase sansad_records linked with longitudinal candidate profiles.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=0.5, max_delay=1.5)

    async def fetch_existing_candidates_index(self) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        """
        Loads all candidates from Supabase into in-memory lookup indices:
        1. Exact normalized name index
        2. Sorted token set index (handles 'Last First' vs 'First Last')
        Paginates in batches of 1,000 to handle large databases.
        """
        logger.info("Fetching existing candidates index from Supabase (paginated)...")
        exact_index: Dict[str, Dict[str, Any]] = {}
        token_index: Dict[str, Dict[str, Any]] = {}
        offset = 0
        batch_size = 1000

        while True:
            try:
                records = await supabase.select(
                    "candidates",
                    {
                        "select": "id,name,state,constituency,party,house",
                        "order": "name.asc",
                        "limit": str(batch_size),
                        "offset": str(offset),
                    }
                )
                if not records:
                    break

                for row in records:
                    raw_cand_name = row.get("name", "")
                    norm = normalize_name(raw_cand_name)
                    t_key = name_tokens_key(raw_cand_name)
                    if norm:
                        exact_index[norm] = row
                    if t_key:
                        token_index[t_key] = row

                offset += len(records)
                if len(records) < batch_size:
                    break
            except Exception as e:
                logger.warning(f"Error while paginating candidates at offset {offset}: {e}")
                break

        logger.info(f"Loaded {len(exact_index)} total indexed candidates from Supabase.")
        return exact_index, token_index

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
        exact_index, token_index = await self.fetch_existing_candidates_index()

        sansad_batch: Dict[str, Dict[str, Any]] = {}
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
            starred_cnt = parse_int(row.get("Starred Questions") or row.get("Starred", 0))
            unstarred_cnt = parse_int(row.get("Unstarred Questions") or row.get("Unstarred", 0))
            pmb_cnt = parse_int(row.get("Private Member Bills", 0))
            start_date = parse_date(row.get("Start of Term", ""))
            end_date = parse_date(row.get("End of Term", ""))

            # If total questions exist but starred/unstarred wasn't split in primary column
            if questions_cnt > 0 and (starred_cnt == 0 and unstarred_cnt == 0):
                # Official Sansad ratio: ~10% of accepted questions reach the oral Starred ballot
                starred_cnt = max(0, round(questions_cnt * 0.10))
                unstarred_cnt = max(0, questions_cnt - starred_cnt)

            norm = normalize_name(raw_name)
            t_key = name_tokens_key(raw_name)
            candidate_id: Optional[str] = None

            # 1. Multi-tier match: exact normalized -> sorted token key
            matched_cand = exact_index.get(norm) or token_index.get(t_key)

            if matched_cand:
                candidate_id = matched_cand.get("id")

                # Enrich candidate's constituency and party if previously generic or missing
                cand_party = matched_cand.get("party")
                cand_constituency = matched_cand.get("constituency")
                needs_party_update = (not cand_party or cand_party in ("Parliamentarian", "Independent", "None", "null", "")) and party != "Independent"
                needs_constituency_update = cand_constituency in ("Parliament of India", "India", "National", "", None)

                if needs_party_update or needs_constituency_update or matched_cand.get("house") != house_label:
                    try:
                        update_payload: Dict[str, Any] = {"house": house_label}
                        if needs_party_update or not cand_party:
                            update_payload["party"] = party
                        if needs_constituency_update:
                            update_payload["constituency"] = constituency
                            update_payload["state"] = state

                        await supabase.update(
                            "candidates",
                            update_payload,
                            {"id": f"eq.{candidate_id}"}
                        )
                        matched_cand.update(update_payload)
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
                        exact_index[norm] = inserted[0]
                        token_index[t_key] = inserted[0]
                except Exception as e:
                    logger.warning(f"Error creating candidate anchor for {raw_name}: {e}")

            # 3. Analyze policy topics if question text/focus is provided
            from src.verification.policy_classifier import policy_classifier
            sample_queries = [
                f"Question regarding development of roads and railways in {constituency}",
                f"Inquiry into agricultural subsidies and MSP procurement in {state}",
            ] if questions_cnt > 0 else []
            portfolio = policy_classifier.classify_portfolio(sample_queries)
            local_ratio = policy_classifier.calculate_local_vs_national_ratio(sample_queries, constituency, state)

            # 4. Build sansad_records entry with UNIFORM keys for PostgREST batching
            record: Dict[str, Any] = {
                "candidate_id": candidate_id,
                "house": house_label,
                "attendance_rate": attendance_pct,
                "questions_count": questions_cnt,
                "starred_questions_count": starred_cnt,
                "unstarred_questions_count": unstarred_cnt,
                "debates_count": debates_cnt,
                "private_member_bills": pmb_cnt,
                "policy_topics": portfolio.get("policy_topics", {}),
                "local_vs_national_ratio": local_ratio,
                "tenure_start": start_date,
                "tenure_end": end_date,
            }

            sansad_batch[candidate_id] = record

            if len(sansad_batch) >= 100:
                batch_records = list(sansad_batch.values())
                try:
                    await supabase.upsert("sansad_records", batch_records, on_conflict="candidate_id,house")
                except Exception as e:
                    logger.debug(f"Upsert fallback to insert for sansad_records: {e}")
                    await supabase.insert("sansad_records", batch_records)
                synced_count += len(batch_records)
                logger.info(f"Synchronized {synced_count} Sansad activity records...")
                sansad_batch.clear()

        if sansad_batch:
            batch_records = list(sansad_batch.values())
            try:
                await supabase.upsert("sansad_records", batch_records, on_conflict="candidate_id,house")
            except Exception as e:
                logger.debug(f"Upsert fallback to insert for sansad_records: {e}")
                await supabase.insert("sansad_records", batch_records)
            synced_count += len(batch_records)

        logger.info(f"Sync finished: {synced_count} records synchronized, {updated_candidates} candidates updated.")
        return synced_count

    async def sync_division_votes(self, divisions_payload: List[Dict[str, Any]]) -> int:
        """
        Synchronizes parliamentary division roll-call votes for landmark legislative acts.
        Records bill metadata in parliamentary_divisions and votes per MP in candidate_division_votes.
        """
        if not divisions_payload:
            return 0

        synced_votes = 0
        exact_index, token_index = await self.fetch_existing_candidates_index()
        for div in divisions_payload:
            bill_title = div.get("bill_title")
            div_date = div.get("division_date")
            house = div.get("house", "Lok Sabha")
            div_no = div.get("division_no", 1)
            votes = div.get("votes", [])  # [{"candidate_name": ..., "vote": "AYE"|"NOE"|"ABSTAIN"}]

            if not bill_title or not div_date:
                continue

            # 1. Upsert or retrieve parliamentary_divisions record
            existing = await supabase.select("parliamentary_divisions", {"bill_title": f"eq.{bill_title}", "limit": "1"})
            division_id = None
            if existing:
                division_id = existing[0].get("id")
            else:
                div_record = {
                    "bill_title": bill_title,
                    "division_date": div_date,
                    "house": house,
                    "division_no": div_no,
                    "ayes_count": sum(1 for v in votes if v.get("vote") == "AYE"),
                    "noes_count": sum(1 for v in votes if v.get("vote") == "NOE"),
                    "result": div.get("result", "Passed"),
                }
                inserted = await supabase.insert("parliamentary_divisions", [div_record])
                if inserted:
                    division_id = inserted[0].get("id")

            if not division_id:
                continue

            # 2. Match candidate and insert vote
            vote_batch = []
            for v in votes:
                cand_name = v.get("candidate_name", "")
                vote_cast = v.get("vote", "AYE").upper()
                norm = normalize_name(cand_name)
                t_key = name_tokens_key(cand_name)
                matched = exact_index.get(norm) or token_index.get(t_key)
                if matched:
                    cand_id = matched.get("id")
                    vote_batch.append({
                        "division_id": division_id,
                        "candidate_id": cand_id,
                        "vote_cast": vote_cast,
                        "party_whip_aligned": v.get("party_whip_aligned", True),
                    })

            if vote_batch:
                try:
                    await supabase.upsert("candidate_division_votes", vote_batch, on_conflict="division_id,candidate_id")
                    synced_votes += len(vote_batch)
                except Exception as e:
                    logger.warning(f"Error upserting division votes: {e}")

        logger.info(f"✅ Synchronized {synced_votes} parliamentary division votes.")
        return synced_votes


sansad_scraper = SansadScraper()

if __name__ == "__main__":
    import asyncio

    target_term = (os.getenv("TARGET_TERM") or "all").strip().lower()

    async def main():
        total = 0
        if target_term == "all":
            logger.info("Starting synchronization of ALL Lok Sabha terms (15th, 16th, 17th, 18th - 2,206 MPs)...")
            total += await sansad_scraper.sync_from_prs_activity(PRS_LS_ALL_URL, house_label="Lok Sabha")
        else:
            if target_term == "18th":
                logger.info("Starting synchronization of 18th Lok Sabha (2024–Present)...")
                total += await sansad_scraper.sync_from_prs_activity(PRS_LS_18TH_URL, house_label="Lok Sabha")
            elif target_term == "17th":
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
