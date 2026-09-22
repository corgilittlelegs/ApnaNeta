import re
import logging
import asyncio
from typing import List, Dict, Any, Optional
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eCourtsClient")

# CNR Number Regular Expression (16 alphanumeric characters: 2-state, 2-district, 2-court, 6-case, 4-year)
CNR_REGEX = re.compile(r"^[A-Z]{4}\d{12}$", re.IGNORECASE)


class ECourtsVerificationClient:
    """
    Evidence-aware eCourts verification adapter.

    A CNR is only a candidate-declared identifier, not proof that a docket was
    retrieved. The client records it as unverified until an authorized eCourts
    adapter supplies a source URL and docket facts. It never infers a court
    stage or Section 8 outcome from an affidavit alone.
    """

    def is_valid_cnr(self, cnr: str) -> bool:
        """Validates standard 16-character alphanumeric CNR syntax."""
        if not cnr:
            return False
        clean = cnr.strip().upper()
        return bool(CNR_REGEX.match(clean))

    def parse_case_cnr_or_identifier(self, case_record: Dict[str, Any]) -> Optional[str]:
        """
        Extracts or derives a CNR/Docket identifier from FIR or case text.
        """
        existing_cnr = case_record.get("cnr_number")
        if existing_cnr and self.is_valid_cnr(existing_cnr):
            return existing_cnr.upper().strip()

        fir_or_case = case_record.get("fir_or_case_number", "")
        # Search for CNR in string
        match = re.search(r"\b[A-Z]{4}\d{12}\b", fir_or_case, re.IGNORECASE)
        if match:
            return match.group(0).upper()

        return None

    async def verify_case_docket(self, case_id: str) -> Dict[str, Any]:
        """
        Records whether a declared CNR can be validated syntactically.

        This method performs no eCourts network request. It therefore cannot
        mark a docket as judicially verified; use record_official_docket_evidence
        after a compliant source adapter has retrieved a docket.
        """
        cases = await supabase.select("criminal_cases", {"id": f"eq.{case_id}", "limit": "1"})
        if not cases:
            return {"verified": False, "error": "Case not found"}

        case = cases[0]
        case_no = case.get("fir_or_case_number", "")

        cnr = self.parse_case_cnr_or_identifier(case)
        if not cnr:
            # Zero synthetic data: When CNR is absent from sworn filings, do not generate synthetic numbers
            logger.info(f"Case {case_no} does not contain a verified 16-character CNR. Marked as unverified.")
            update_payload = {
                "cnr_number": None,
                "ecourts_verified": False,
                "ecourts_stage": None,
                "is_rpa_section_8_disqualified": None,
            }
            await supabase.update("criminal_cases", update_payload, {"id": f"eq.{case_id}"})
            return {
                "verified": False,
                "cnr": None,
                "stage": None,
                "is_rpa_disqualified": None,
                "error": "Primary filing lacks 16-character CNR identifier",
            }

        update_payload = {
            "cnr_number": cnr,
            "ecourts_verified": False,
            "ecourts_stage": None,
            "is_rpa_section_8_disqualified": None,
        }

        try:
            await supabase.update("criminal_cases", update_payload, {"id": f"eq.{case_id}"})
            logger.info(
                f"CNR identifier recorded for case {case_no} (CNR: {cnr}); "
                "no official docket evidence has been retrieved."
            )
            return {
                "verified": False,
                "cnr": cnr,
                "stage": None,
                "is_rpa_disqualified": None,
                "error": "CNR syntax is valid but no official eCourts docket evidence was supplied",
            }
        except Exception as e:
            logger.error(f"Failed to update eCourts verification for {case_id}: {e}")
            return {"verified": False, "error": str(e)}

    async def record_official_docket_evidence(
        self,
        case_id: str,
        *,
        cnr: str,
        stage: str,
        source_url: str,
        retrieved_at: str,
        is_rpa_section_8_disqualified: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Persists docket facts supplied by a compliant, source-attributed adapter."""
        if not self.is_valid_cnr(cnr):
            return {"verified": False, "error": "Invalid CNR"}
        if not source_url.startswith("https://") or not retrieved_at or not stage:
            return {"verified": False, "error": "Official source URL, retrieval time, and stage are required"}

        payload = {
            "cnr_number": cnr.strip().upper(),
            "ecourts_verified": True,
            "ecourts_stage": stage.strip(),
            "ecourts_source_url": source_url,
            "ecourts_retrieved_at": retrieved_at,
            "is_rpa_section_8_disqualified": is_rpa_section_8_disqualified,
        }
        await supabase.update("criminal_cases", payload, {"id": f"eq.{case_id}"})
        return {"verified": True, "cnr": payload["cnr_number"], "stage": payload["ecourts_stage"]}

    async def run(self) -> List[Dict[str, Any]]:
        """Verifies all criminal cases currently recorded in Supabase."""
        logger.info("==========================================================")
        logger.info("Starting eCourts Services Judicial Docket Verification Engine")
        logger.info("==========================================================")

        cases = await supabase.select_all("criminal_cases")
        logger.info(f"Loaded {len(cases)} judicial cases for verification.")
        results = []

        for c in cases:
            c_id = c.get("id")
            if c_id:
                res = await self.verify_case_docket(c_id)
                results.append(res)

        logger.info("==========================================================")
        logger.info(f"✅ eCourts Verification Complete! Audited {len(results)} of {len(cases)} judicial dockets.")
        logger.info("==========================================================")
        return results


ecourts_client = ECourtsVerificationClient()

if __name__ == "__main__":
    asyncio.run(ecourts_client.run())
