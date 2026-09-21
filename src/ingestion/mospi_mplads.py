import os
import sys
import logging
import asyncio
import csv
import io
import re
from typing import List, Dict, Any, Optional
try:
    import httpx
except ImportError:
    httpx = None

from config.settings import settings
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MoSPIMPLADSIngest")

# Official MoSPI e-SAKSHI MPLADS Portal URL
ESAKSHI_BASE_URL = "https://mplads.mospi.gov.in"

# Authentic MoSPI 17th Lok Sabha (2019-2024) MPLADS expenditure dataset
# Published under Open Data Commons Open Database License (ODbL) via OpenCity.in
OPENCITY_17TH_LS_CSV_URL = (
    "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/"
    "resource/e4524ed7-6c9b-41a5-ad0a-003358fdabca/download/4d2bc892-cd12-4f17-befa-aa7efb6e210b.csv"
)


class MoSPIMPLADSClient:
    """
    Ingests and tracks Member of Parliament Local Area Development Scheme (MPLADS) funds
    from the Ministry of Statistics and Programme Implementation (MoSPI / e-SAKSHI).
    Calculates Expenditure Velocity, unspent public balances, and developmental project delivery.
    Operates strictly on genuine portal data without synthetic estimates or placeholder arrays.
    """

    def clean_numeric(self, val: Any) -> float:
        """Cleans and standardizes numeric values from portal and open datasets."""
        if val is None:
            return 0.0
        s = str(val).strip().replace(",", "")
        cleaned = re.sub(r"[^\d.]", "", s)
        try:
            num = float(cleaned) if cleaned else 0.0
            # If the portal/dataset expresses amounts in Crores (e.g. 25.0, 17.5):
            # Convert to Indian Rupees (1 Crore = 10,000,000 INR) if <= 500
            if 0 < num <= 500.0:
                num = round(num * 10000000.0, 2)
            return num
        except ValueError:
            return 0.0

    def clean_percentage(self, val: Any, expenditure: float, released: float) -> float:
        """Parses utilization rate or computes expenditure velocity."""
        if val is not None:
            cleaned = re.sub(r"[^\d.]", "", str(val).strip())
            try:
                num = float(cleaned) if cleaned else 0.0
                if 0.0 < num <= 1.0:
                    num = round(num * 100.0, 2)
                if num > 0:
                    return num
            except ValueError:
                pass
        return self.calculate_expenditure_velocity(expenditure, released)

    def calculate_expenditure_velocity(self, expenditure: float, released: float) -> float:
        """
        Expenditure Velocity / Utilization Rate % = (Expenditure / Released) * 100.
        """
        if released <= 0:
            return 0.0
        return round((expenditure / released) * 100.0, 2)

    def audit_statutory_suballocations(
        self,
        expenditure_amount: float,
        sc_spent: Optional[float] = None,
        st_spent: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Audits compliance with mandatory MoSPI MPLADS statutory guidelines:
        - Scheduled Caste (SC) areas: Minimum 15.0% of total expenditure
        - Scheduled Tribe (ST) areas: Minimum 7.5% of total expenditure
        Zero synthetic assumptions: If SC or ST spent is omitted, marks compliance as None.
        """
        if expenditure_amount <= 0:
            return {
                "sc_compliant": True,
                "st_compliant": True,
                "sc_percentage": 0.0,
                "st_percentage": 0.0,
                "notes": "No expenditures recorded yet",
            }

        if sc_spent is None or st_spent is None:
            return {
                "sc_compliant": None,
                "st_compliant": None,
                "sc_percentage": None,
                "st_percentage": None,
                "sc_target_percentage": 15.0,
                "st_target_percentage": 7.5,
                "sc_spent": sc_spent,
                "st_spent": st_spent,
                "has_statutory_shortfall": None,
                "notes": "Granular SC/ST expenditure sub-allocations not disclosed in primary record",
            }

        sc_pct = round((sc_spent / expenditure_amount) * 100.0, 2)
        st_pct = round((st_spent / expenditure_amount) * 100.0, 2)

        sc_compliant = sc_pct >= 15.0
        st_compliant = st_pct >= 7.5

        return {
            "sc_compliant": sc_compliant,
            "st_compliant": st_compliant,
            "sc_percentage": sc_pct,
            "st_percentage": st_pct,
            "sc_target_percentage": 15.0,
            "st_target_percentage": 7.5,
            "sc_spent": sc_spent,
            "st_spent": st_spent,
            "has_statutory_shortfall": not (sc_compliant and st_compliant),
        }

    async def fetch_constituency_mplads_online(self, state: str, constituency: str) -> Optional[Dict[str, Any]]:
        """
        Polls official e-SAKSHI summary endpoints for live constituency MPLADS figures.
        Follows redirects, handles browser content negotiation, and parses HTML dashboards.
        """
        logger.info(f"Querying e-SAKSHI portal for {constituency}, {state}...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json, text/html, application/xhtml+xml, */*",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, headers=headers) as client:
                url = f"{ESAKSHI_BASE_URL}/api/public/summary?state={state}&constituency={constituency}"
                resp = await client.get(url)
                if resp.status_code == 200:
                    content_type = resp.headers.get("content-type", "").lower()
                    if "application/json" in content_type:
                        return resp.json()
                    if "text/html" in content_type:
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(resp.text, "html.parser")
                        table = soup.find("table")
                        if table:
                            rows = table.find_all("tr")
                            for r in rows:
                                cells = [c.get_text(strip=True) for c in r.find_all(["td", "th"])]
                                if len(cells) >= 4 and any(constituency.lower() in c.lower() for c in cells):
                                    return {
                                        "constituency": constituency,
                                        "state": state,
                                        "released_amount": float(re.sub(r"[^\d.]", "", cells[1]) or 0),
                                        "expenditure_amount": float(re.sub(r"[^\d.]", "", cells[2]) or 0),
                                        "unspent_balance": float(re.sub(r"[^\d.]", "", cells[3]) or 0),
                                    }
                logger.warning(f"e-SAKSHI live query returned status {resp.status_code} for {constituency}, {state}")
                return None
        except Exception as e:
            logger.debug(f"e-SAKSHI live query returned: {e}")
            return None

    async def sync_candidate_mplads(self, data_item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Matches an MP in Supabase and registers or updates their MPLADS tracking record.
        """
        cand_name = data_item.get("candidate_name")
        constituency = data_item.get("constituency")
        state = data_item.get("state")
        term_years = data_item.get("term_years", "2019-2024")

        released = float(data_item.get("released_amount", 0.0))
        expenditure = float(data_item.get("expenditure_amount", 0.0))
        unspent = max(0.0, released - expenditure)
        velocity = self.calculate_expenditure_velocity(expenditure, released)

        # 1. Match candidate in Supabase
        candidate_id: Optional[str] = None
        try:
            if cand_name:
                matched = await supabase.select("candidates", {"name": f"eq.{cand_name}", "limit": "1"})
                if matched:
                    candidate_id = matched[0].get("id")
            if not candidate_id and constituency and state:
                matched_const = await supabase.select(
                    "candidates",
                    {"constituency": f"eq.{constituency}", "state": f"eq.{state}", "limit": "1"},
                )
                if matched_const:
                    candidate_id = matched_const[0].get("id")
        except Exception as e:
            logger.warning(f"Error matching candidate for MPLADS ({cand_name}): {e}")

        if not candidate_id:
            logger.warning(f"Candidate {cand_name} ({constituency}, {state}) not found in Supabase. Skipping.")
            return None

        # 2. Prepare payload
        record = {
            "candidate_id": candidate_id,
            "constituency": constituency or "Constituency",
            "state": state or "India",
            "term_years": term_years,
            "entitled_amount": float(data_item.get("entitled_amount", 250000000.00)),
            "released_amount": released,
            "expenditure_amount": expenditure,
            "unspent_balance": unspent,
            "utilization_rate": velocity,
            "works_recommended": int(data_item.get("works_recommended", 0)),
            "works_completed": int(data_item.get("works_completed", 0)),
        }

        # 3. Upsert into mplads_records table
        try:
            await supabase.upsert("mplads_records", [record], on_conflict="candidate_id,term_years")
            logger.info(
                f"✅ Synced MPLADS for {cand_name} ({constituency}): "
                f"Spent ₹{expenditure/10000000:.2f}Cr / ₹{released/10000000:.2f}Cr ({velocity}% velocity) | "
                f"Unspent: ₹{unspent/10000000:.2f}Cr"
            )
            return record
        except Exception as e:
            logger.error(f"Failed to upsert MPLADS record for {cand_name}: {e}")
            return None

    async def ingest_opencity_17th_ls_dataset(self) -> int:
        """
        Streams and ingests the authentic 17th Lok Sabha (2019-2024) MPLADS expenditure dataset
        sourced from MoSPI via OpenCity.in under ODbL License.
        Maps authentic government figures for 543 parliamentary constituencies into mplads_records.
        """
        logger.info("Fetching authentic 17th Lok Sabha MPLADS dataset from OpenCity.in...")
        headers = {
            "User-Agent": "ApnaNeta-CivicLedger/1.0 (Transparency Audit)",
            "Accept": "text/csv, application/octet-stream, */*",
        }
        csv_text = None
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as client:
                resp = await client.get(OPENCITY_17TH_LS_CSV_URL)
                if resp.status_code == 200 and resp.text:
                    csv_text = resp.text
                else:
                    logger.warning(f"OpenCity dataset download returned HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"Failed to fetch OpenCity MPLADS dataset: {e}")

        if not csv_text:
            logger.info("OpenCity dataset unavailable or empty.")
            return 0

        # Load candidates from Supabase for fast in-memory matching
        try:
            all_cands = await supabase.select("candidates", {"select": "id,name,constituency,state", "limit": "2000"})
        except Exception as e:
            logger.error(f"Failed to fetch candidates from Supabase: {e}")
            all_cands = []

        if not all_cands:
            logger.warning("No candidates found in Supabase to match MPLADS records.")
            return 0

        def norm_key(s: Optional[str]) -> str:
            if not s:
                return ""
            return re.sub(r"[^a-z0-9]", "", s.lower())

        constituency_map: Dict[str, Dict[str, Any]] = {}
        name_map: Dict[str, Dict[str, Any]] = {}

        for c in all_cands:
            c_const = norm_key(c.get("constituency"))
            c_name = norm_key(c.get("name"))
            if c_const:
                constituency_map[c_const] = c
            if c_name:
                name_map[c_name] = c

        reader = csv.DictReader(io.StringIO(csv_text))
        records_to_upsert = []

        for row in reader:
            # Strip whitespace and UTF-8 BOM from all keys and values
            clean_row = {
                k.strip().lstrip("\ufeff"): (v.strip() if isinstance(v, str) else v)
                for k, v in row.items() if k is not None
            }

            mp_name = (
                clean_row.get("MP Name") or clean_row.get("MP_Name") or clean_row.get("mp_name") or
                clean_row.get("Name") or ""
            ).strip()
            constituency = (
                clean_row.get("Constituency") or clean_row.get("constituency") or ""
            ).strip()

            matched_cand = None
            if constituency and norm_key(constituency) in constituency_map:
                matched_cand = constituency_map[norm_key(constituency)]
            elif mp_name and norm_key(mp_name) in name_map:
                matched_cand = name_map[norm_key(mp_name)]
            else:
                n_mp = norm_key(mp_name)
                n_const = norm_key(constituency)
                for k_const, cand in constituency_map.items():
                    if n_const and (n_const in k_const or k_const in n_const):
                        matched_cand = cand
                        break
                if not matched_cand and n_mp:
                    for k_name, cand in name_map.items():
                        if n_mp in k_name or k_name in n_mp:
                            matched_cand = cand
                            break

            if not matched_cand:
                continue

            entitlement = self.clean_numeric(clean_row.get("Entitlement") or clean_row.get("entitled_amount"))
            if entitlement <= 0:
                entitlement = 250000000.00

            released = self.clean_numeric(clean_row.get("FundReceivedGOI") or clean_row.get("released_amount"))
            expenditure = self.clean_numeric(clean_row.get("ActualExpenditureIncurred") or clean_row.get("expenditure_amount"))
            unspent = self.clean_numeric(clean_row.get("UnspentBalance") or clean_row.get("unspent_balance"))
            if unspent <= 0 and released > expenditure:
                unspent = max(0.0, released - expenditure)

            utilization = self.clean_percentage(
                clean_row.get("UtilizationOverRelease") or clean_row.get("utilization_rate"),
                expenditure,
                released,
            )

            works_recomm = int(self.clean_numeric(clean_row.get("WorksRecomm") or clean_row.get("works_recommended") or 0))
            works_comp = int(self.clean_numeric(clean_row.get("WorksCompleted") or clean_row.get("works_completed") or 0))

            record = {
                "candidate_id": matched_cand["id"],
                "constituency": matched_cand.get("constituency") or constituency,
                "state": matched_cand.get("state") or "India",
                "term_years": "2019-2024",
                "entitled_amount": entitlement,
                "released_amount": released,
                "expenditure_amount": expenditure,
                "unspent_balance": unspent,
                "utilization_rate": utilization,
                "works_recommended": works_recomm,
                "works_completed": works_comp,
            }
            records_to_upsert.append(record)

        if not records_to_upsert:
            logger.info("No matching candidates found for OpenCity MPLADS dataset.")
            return 0

        # Batch upsert in chunks of 50
        upserted_count = 0
        chunk_size = 50
        for i in range(0, len(records_to_upsert), chunk_size):
            chunk = records_to_upsert[i : i + chunk_size]
            try:
                await supabase.upsert("mplads_records", chunk, on_conflict="candidate_id,term_years")
                upserted_count += len(chunk)
                logger.info(f"Upserted {upserted_count}/{len(records_to_upsert)} MPLADS records from OpenCity dataset.")
            except Exception as e:
                logger.error(f"Error upserting chunk to mplads_records: {e}")

        logger.info(f"Successfully synced {upserted_count} authentic MPLADS records from OpenCity (MoSPI).")
        return upserted_count

    async def run(self) -> List[Dict[str, Any]]:
        """
        Executes MPLADS fund synchronization:
        1. Ingests authentic 17th Lok Sabha dataset from OpenCity (MoSPI).
        2. Polls live e-SAKSHI summary endpoint for recent updates.
        """
        logger.info("==========================================================")
        logger.info("Starting MoSPI MPLADS Fund Tracking & Velocity Engine")
        logger.info("==========================================================")

        # 1. Ingest authentic MoSPI data from OpenCity
        await self.ingest_opencity_17th_ls_dataset()

        # 2. Query candidates for any live updates
        candidates = await supabase.select("candidates", {"limit": "50"})
        results = []

        for cand in candidates:
            constituency = cand.get("constituency")
            state = cand.get("state")
            if constituency and state and constituency not in ("Parliament of India", "Constituency"):
                live_data = await self.fetch_constituency_mplads_online(state, constituency)
                if live_data:
                    res = await self.sync_candidate_mplads(live_data)
                    if res:
                        results.append(res)

        logger.info("==========================================================")
        logger.info(f"MPLADS Sync Complete! Live queries updated {len(results)} parliamentary fund records.")
        logger.info("==========================================================")
        return results


mplads_client = MoSPIMPLADSClient()

if __name__ == "__main__":
    asyncio.run(mplads_client.run())

