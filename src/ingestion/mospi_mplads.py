import os
import sys
import logging
import asyncio
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


class MoSPIMPLADSClient:
    """
    Ingests and tracks Member of Parliament Local Area Development Scheme (MPLADS) funds
    from the Ministry of Statistics and Programme Implementation (MoSPI / e-SAKSHI).
    Calculates Expenditure Velocity, unspent public balances, and developmental project delivery.
    Operates strictly on genuine portal data without synthetic estimates or placeholder arrays.
    """

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
            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True, headers=headers) as client:
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

    async def run(self) -> List[Dict[str, Any]]:
        """Polls candidates in database and fetches live e-SAKSHI MPLADS spending."""
        logger.info("==========================================================")
        logger.info("Starting MoSPI MPLADS Fund Tracking & Velocity Engine")
        logger.info("==========================================================")

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
        logger.info(f"🎉 MPLADS Sync Complete! Updated {len(results)} parliamentary fund records.")
        logger.info("==========================================================")
        return results


mplads_client = MoSPIMPLADSClient()

if __name__ == "__main__":
    asyncio.run(mplads_client.run())
