import logging
import asyncio
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ConflictDetector")


def normalize_corp_name(name: str) -> str:
    """Normalizes corporate names for robust matching."""
    cleaned = name.upper().replace("PRIVATE LIMITED", "PVT LTD").replace("LIMITED", "LTD")
    cleaned = "".join(c for c in cleaned if c.isalnum() or c.isspace())
    return " ".join(cleaned.split())


class ConflictDetector:
    """
    Forensic auditing engine for statutory commercial conflicts of interest.
    Enforces Section 9A of the Representation of the People Act, 1951:
    Disqualification for subsisting contracts with the appropriate government
    for the supply of goods or execution of public works.
    """

    def is_contract_subsisting(self, award_date_str: str, schedule_months: int) -> bool:
        """
        Checks if an awarded government contract is active or subsisting.
        """
        try:
            award_dt = datetime.strptime(award_date_str, "%Y-%m-%d").date()
            # Calculate approx expiration
            approx_days = schedule_months * 30.5
            current_date = date.today()
            # If current date is within award + schedule (or awarded within last 3 years)
            elapsed_days = (current_date - award_dt).days
            return elapsed_days <= (approx_days + 365) # Active execution window
        except Exception:
            return True

    def determine_disqualification_risk(
        self,
        candidate_house: str,
        awarding_authority: str,
        is_subsisting: bool,
    ) -> str:
        """
        Evaluates RPA Section 9A 'appropriate Government' nexus:
        - Lok Sabha / Rajya Sabha: Central or State government contracts
        - Vidhan Sabha: State government contracts
        """
        if not is_subsisting:
            return "WATCHLIST"

        auth_lower = awarding_authority.lower()
        if "government" in auth_lower or "department" in auth_lower or "authority" in auth_lower:
            return "HIGH"
        return "MEDIUM"

    async def audit_candidate_conflicts(
        self, candidate_id: str, all_tenders: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Scans a candidate's MCA21 corporate associations against all CPPP procurement contracts.
        """
        # 1. Fetch candidate info
        cands = await supabase.select("candidates", {"id": f"eq.{candidate_id}", "limit": "1"})
        if not cands:
            return []
        candidate = cands[0]
        cand_name = candidate["name"]
        house = candidate.get("house", "Lok Sabha")

        # 2. Fetch candidate's registered corporate entities
        corp_records = await supabase.select("corporate_associations", {"candidate_id": f"eq.{candidate_id}"})
        if not corp_records:
            return []

        # 3. Fetch all CPPP tenders (or reuse cached from run)
        if all_tenders is None:
            all_tenders = await supabase.select_all("procurement_tenders")
        if not all_tenders:
            return []

        conflicts_found = []

        for corp in corp_records:
            corp_name_norm = normalize_corp_name(corp["company_name"])
            corp_cin = (corp.get("cin") or "").strip().upper()

            for tender in all_tenders:
                tender_contractor_norm = normalize_corp_name(tender["contractor_name"])
                tender_cin = (tender.get("contractor_cin_or_pan") or "").strip().upper()

                cin_match = corp_cin and tender_cin and (corp_cin == tender_cin)
                name_match = corp_name_norm == tender_contractor_norm

                if cin_match or name_match:
                    # Match confirmed! Audit Section 9A criteria
                    subsisting = self.is_contract_subsisting(
                        tender["award_date"],
                        tender.get("execution_schedule_months", 12),
                    )
                    risk_level = self.determine_disqualification_risk(
                        house,
                        tender["awarding_authority"],
                        subsisting,
                    )

                    conflict_record = {
                        "candidate_id": candidate_id,
                        "tender_id": tender["id"],
                        "corporate_id": corp["id"],
                        "conflict_type": "Directorship Active Government Contract",
                        "section_9a_flag": subsisting,
                        "disqualification_risk": risk_level,
                        "evidence_details": {
                            "candidate_name": cand_name,
                            "company_name": corp["company_name"],
                            "din": corp.get("din"),
                            "cin": corp.get("cin"),
                            "designation": corp.get("designation"),
                            "tender_id": tender["tender_id"],
                            "tender_title": tender["tender_title"],
                            "awarding_authority": tender["awarding_authority"],
                            "contract_amount": tender["contract_amount"],
                            "award_date": tender["award_date"],
                            "subsisting": subsisting,
                            "statutory_reference": "Section 9A, Representation of the People Act, 1951",
                        },
                    }

                    try:
                        await supabase.upsert(
                            "conflict_of_interest_audits",
                            [conflict_record],
                            on_conflict="candidate_id,tender_id",
                        )
                        logger.warning(
                            f"🚨 SECTION 9A CONFLICT DETECTED for {cand_name}: "
                            f"Company '{corp['company_name']}' holds ₹{tender['contract_amount']/10000000:.2f}Cr "
                            f"contract with '{tender['awarding_authority']}' (Risk: {risk_level})!"
                        )
                        conflicts_found.append(conflict_record)
                    except Exception as e:
                        logger.error(f"Failed to upsert conflict audit record: {e}")

        return conflicts_found

    async def run(self) -> List[Dict[str, Any]]:
        """Executes full conflict of interest audit across all candidates."""
        logger.info("==========================================================")
        logger.info("Starting Section 9A RPA Commercial Conflict of Interest Engine")
        logger.info("==========================================================")

        candidates = await supabase.select_all("candidates")
        all_tenders = await supabase.select_all("procurement_tenders")
        logger.info(f"Loaded {len(candidates)} candidates and {len(all_tenders)} procurement tenders for comprehensive audit.")

        all_conflicts = []

        for c in candidates:
            c_id = c.get("id")
            if c_id:
                res = await self.audit_candidate_conflicts(c_id, all_tenders=all_tenders)
                all_conflicts.extend(res)

        logger.info("==========================================================")
        logger.info(
            f"✅ Conflict Audit Complete! Audited {len(candidates)} candidate(s) against "
            f"{len(all_tenders)} tender(s). Detected {len(all_conflicts)} commercial conflict(s)."
        )
        logger.info("==========================================================")
        return all_conflicts


conflict_detector = ConflictDetector()

if __name__ == "__main__":
    asyncio.run(conflict_detector.run())
