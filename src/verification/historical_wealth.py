import os
import sys
import logging
import asyncio
from typing import List, Dict, Any, Optional

from config.settings import settings
from src.storage.supabase_client import supabase
from src.verification.entity_resolution import entity_resolver
from src.verification.wealth_analyzer import wealth_analyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HistoricalWealthEngine")


class HistoricalWealthEngine:
    """
    Connects Indic entity resolution with multi-term wealth analysis.
    Dynamically tracks politicians' asset trajectories across successive election
    filings in Supabase, computing step-wise growth and CAGR without any hardcoded
    placeholder datasets.
    """

    async def analyze_candidate_history(self, candidate_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all historical affidavits for a candidate and computes CAGR dynamically.
        """
        cands = await supabase.select("candidates", {"id": f"eq.{candidate_id}", "limit": "1"})
        if not cands:
            return []
        cand = cands[0]
        cand_name = cand.get("name", "Candidate")
        state = cand.get("state", "India")

        affidavits = await supabase.select(
            "affidavits",
            {"candidate_id": f"eq.{candidate_id}", "order": "filing_year.asc"},
        )
        if not affidavits or len(affidavits) < 2:
            return []

        filings = []
        for aff in affidavits:
            year = aff.get("filing_year")
            payload = aff.get("raw_payload", {}) or {}
            summary = payload.get("part_b_summary", {}) or {}
            mov = float(summary.get("movable_assets_total", 0.0))
            immov = float(summary.get("immovable_assets_total", 0.0))
            total = mov + immov

            cand_meta = payload.get("candidate", {}) or {}
            age = cand_meta.get("age")

            if year and total > 0:
                filings.append({
                    "year": int(year),
                    "age": age,
                    "total_assets": total,
                })

        if len(filings) < 2:
            return []

        # Validate entity resolution across consecutive terms (age drift check)
        for i in range(len(filings) - 1):
            f1 = filings[i]
            f2 = filings[i + 1]
            cand_a = {"name": cand_name, "state": state, "age": f1.get("age"), "filing_year": f1["year"]}
            cand_b = {"name": cand_name, "state": state, "age": f2.get("age"), "filing_year": f2["year"]}
            is_match, sim, reason = entity_resolver.is_same_candidate(cand_a, cand_b)
            if not is_match:
                logger.warning(f"Entity resolution warning for {cand_name} ({f1['year']} -> {f2['year']}): {reason}")

        # Compute growth reports
        growth_reports = wealth_analyzer.analyze_longitudinal_growth(cand_name, filings)

        db_records = []
        for r in growth_reports:
            db_records.append(
                {
                    "candidate_id": candidate_id,
                    "from_year": r["from_year"],
                    "to_year": r["to_year"],
                    "initial_assets": r["initial_assets"],
                    "final_assets": r["final_assets"],
                    "absolute_increase": r["absolute_increase"],
                    "percentage_increase": r["percentage_increase"],
                    "cagr_percent": r["cagr_percent"],
                    "is_rapid_accumulation": r["is_rapid_accumulation"],
                }
            )

        if db_records:
            try:
                await supabase.upsert(
                    "historical_wealth_cagr",
                    db_records,
                    on_conflict="candidate_id,from_year,to_year",
                )
                for r in growth_reports:
                    anomaly_str = " ⚠️ RAPID ACCUMULATION" if r["is_rapid_accumulation"] else ""
                    logger.info(
                        f"📈 {cand_name} ({r['from_year']} -> {r['to_year']}): "
                        f"₹{r['initial_assets']:,.2f} -> ₹{r['final_assets']:,.2f} "
                        f"(+{r['percentage_increase']}%, CAGR {r['cagr_percent']}%){anomaly_str}"
                    )
            except Exception as e:
                logger.error(f"Failed to upsert CAGR records for {cand_name}: {e}")

        return growth_reports

    async def run(self) -> List[Dict[str, Any]]:
        """
        Scans all candidates in database and computes dynamic longitudinal wealth growth.
        Zero hardcoded sample data.
        """
        logger.info("==========================================================")
        logger.info("Starting Multi-Term Historical Wealth Growth Engine (CAGR)")
        logger.info("==========================================================")

        from collections import Counter
        affidavits = await supabase.select_all("affidavits", params={"select": "candidate_id,filing_year"})
        cand_counts = Counter(a.get("candidate_id") for a in affidavits if a.get("candidate_id"))
        eligible_cids = [cid for cid, count in cand_counts.items() if count >= 2]

        logger.info(f"Loaded {len(affidavits)} total affidavit(s). Found {len(eligible_cids)} candidate(s) with multi-term filings.")
        all_results = []

        for c_id in eligible_cids:
            res = await self.analyze_candidate_history(c_id)
            all_results.extend(res)

        logger.info("==========================================================")
        logger.info(f"🎉 Analysis Complete! Audited {len(eligible_cids)} candidate(s) with multi-term filings, generated {len(all_results)} intervals.")
        logger.info("==========================================================")
        return all_results


historical_wealth_engine = HistoricalWealthEngine()


if __name__ == "__main__":
    asyncio.run(historical_wealth_engine.run())
