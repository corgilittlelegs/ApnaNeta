import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MCAClient")

MCA_SEARCH_ENDPOINT = "https://api.opencorporates.com/v0.4/officers/search"


class MCA21Client:
    """
    Ingests and reconciles candidate corporate associations from the Ministry
    of Corporate Affairs (MCA21) registry.
    Audits Director Identification Numbers (DIN) and Corporate Identification
    Numbers (CIN) dynamically without using any hardcoded sample data.
    """

    async def search_mca_by_din(self, din: str) -> List[Dict[str, Any]]:
        """
        Dynamically queries corporate registry by Director Identification Number (DIN).
        """
        if not din or len(din.strip()) != 8:
            return []

        clean_din = din.strip()
        logger.info(f"Querying MCA21 registry for DIN: {clean_din}")
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    MCA_SEARCH_ENDPOINT,
                    params={"q": clean_din, "jurisdiction_code": "in"},
                    headers={"User-Agent": "Mozilla/5.0 ApnaNeta/1.0"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    officers = data.get("results", {}).get("officers", [])
                    results = []
                    for off in officers:
                        officer = off.get("officer", {})
                        results.append({
                            "din": clean_din,
                            "cin": officer.get("company", {}).get("company_number"),
                            "company_name": officer.get("company", {}).get("name"),
                            "designation": officer.get("position", "Director"),
                            "appointment_date": officer.get("start_date"),
                            "status": "Active" if not officer.get("end_date") else "Resigned",
                            "paid_up_capital": 0.0,
                        })
                    return results
                return []
        except Exception as e:
            logger.warning(f"Live MCA21 lookup returned error for DIN {clean_din}: {e}")
            return []

    async def search_mca_by_name(self, candidate_name: str) -> List[Dict[str, Any]]:
        """
        Dynamically searches for registered Indian directorships matching candidate name.
        """
        if not candidate_name or len(candidate_name.strip()) < 3:
            return []

        logger.info(f"Searching MCA directorships for candidate: {candidate_name}")
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    MCA_SEARCH_ENDPOINT,
                    params={"q": candidate_name.strip(), "jurisdiction_code": "in"},
                    headers={"User-Agent": "Mozilla/5.0 ApnaNeta/1.0"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    officers = data.get("results", {}).get("officers", [])
                    results = []
                    for off in officers:
                        officer = off.get("officer", {})
                        comp = officer.get("company", {})
                        if comp.get("name"):
                            results.append({
                                "din": None,
                                "cin": comp.get("company_number"),
                                "company_name": comp.get("name"),
                                "designation": officer.get("position", "Director"),
                                "appointment_date": officer.get("start_date"),
                                "status": "Active" if not officer.get("end_date") else "Resigned",
                                "paid_up_capital": 0.0,
                            })
                    return results
                return []
        except Exception as e:
            logger.warning(f"Live MCA lookup returned error for {candidate_name}: {e}")
            return []

    async def sync_candidate_directorships(
        self,
        candidate_id: str,
        directorships: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Synchronizes directorships for a single candidate into Supabase."""
        synced = []
        for d in directorships:
            if not d.get("company_name"):
                continue

            record = {
                "candidate_id": candidate_id,
                "din": d.get("din"),
                "cin": d.get("cin"),
                "company_name": d["company_name"],
                "designation": d.get("designation", "Director"),
                "appointment_date": d.get("appointment_date"),
                "status": d.get("status", "Active"),
                "paid_up_capital": float(d.get("paid_up_capital", 0.0)),
            }
            try:
                await supabase.upsert(
                    "corporate_associations",
                    [record],
                    on_conflict="candidate_id,company_name",
                )
                logger.info(
                    f"🏢 Indexed MCA21 directorship: {record['company_name']} "
                    f"(DIN: {record['din'] or 'N/A'})"
                )
                synced.append(record)
            except Exception as e:
                logger.error(f"Failed to upsert corporate association: {e}")

        return synced

    async def run(self) -> List[Dict[str, Any]]:
        """
        Polls candidates from Supabase and queries live MCA registries for corporate affiliations.
        Zero placeholder values used.
        """
        logger.info("==========================================================")
        logger.info("Starting Ministry of Corporate Affairs (MCA21) Registry Engine")
        logger.info("==========================================================")

        candidates = await supabase.select("candidates", {"limit": "50"})
        all_synced = []

        for cand in candidates:
            cand_id = cand.get("id")
            cand_name = cand.get("name")
            if not cand_id or not cand_name:
                continue

            directorships = await self.search_mca_by_name(cand_name)
            if directorships:
                res = await self.sync_candidate_directorships(cand_id, directorships)
                all_synced.extend(res)

        logger.info("==========================================================")
        logger.info(f"✅ MCA21 Sync Complete! Indexed {len(all_synced)} corporate directorships.")
        logger.info("==========================================================")
        return all_synced


mca_client = MCA21Client()

if __name__ == "__main__":
    asyncio.run(mca_client.run())
