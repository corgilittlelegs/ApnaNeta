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

# Canonical longitudinal filings across general election cycles (2014 -> 2019 -> 2024)
CANONICAL_HISTORICAL_FILINGS = [
    {
        "candidate_name": "Narendra Modi",
        "state": "Uttar Pradesh",
        "filings": [
            {"year": 2014, "age": 63, "total_assets": 16564685.00},
            {"year": 2019, "age": 68, "total_assets": 25136119.00},
            {"year": 2024, "age": 73, "total_assets": 30206000.00},
        ],
    },
    {
        "candidate_name": "Rahul Gandhi",
        "state": "Uttar Pradesh",
        "filings": [
            {"year": 2014, "age": 43, "total_assets": 94000000.00},
            {"year": 2019, "age": 48, "total_assets": 158800000.00},
            {"year": 2024, "age": 53, "total_assets": 203800000.00},
        ],
    },
    {
        "candidate_name": "Kanimozhi Karunanidhi",
        "state": "Tamil Nadu",
        "filings": [
            {"year": 2014, "age": 46, "total_assets": 265000000.00},
            {"year": 2019, "age": 51, "total_assets": 303300000.00},
            {"year": 2024, "age": 56, "total_assets": 572700000.00},
        ],
    },
    {
        "candidate_name": "Supriya Sule",
        "state": "Maharashtra",
        "filings": [
            {"year": 2014, "age": 44, "total_assets": 1139000000.00},
            {"year": 2019, "age": 49, "total_assets": 1408800000.00},
            {"year": 2024, "age": 54, "total_assets": 1664000000.00},
        ],
    },
    {
        "candidate_name": "Akhilesh Yadav",
        "state": "Uttar Pradesh",
        "filings": [
            {"year": 2014, "age": 40, "total_assets": 88400000.00},
            {"year": 2019, "age": 45, "total_assets": 377800000.00},  # +327% surge
            {"year": 2024, "age": 50, "total_assets": 422200000.00},
        ],
    },
]


class HistoricalWealthEngine:
    """
    Connects Indic entity resolution with multi-term wealth analysis.
    Tracks politicians' asset trajectories from 2014 to 2024 and flags rapid wealth spikes.
    """

    async def match_candidate_id(self, name: str, state: str) -> Optional[str]:
        """Finds candidate UUID in Supabase using name and state."""
        try:
            matched = await supabase.select("candidates", {"name": f"eq.{name}", "limit": "1"})
            if matched:
                return matched[0].get("id")
        except Exception as e:
            logger.warning(f"Error finding candidate {name}: {e}")
        return None

    async def analyze_and_persist(self, candidate_record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Runs longitudinal growth analysis and upserts records into historical_wealth_cagr.
        """
        cand_name = candidate_record["candidate_name"]
        state = candidate_record["state"]
        filings = candidate_record["filings"]

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
        candidate_id = await self.match_candidate_id(cand_name, state)

        if not candidate_id:
            logger.warning(f"Candidate {cand_name} not found in Supabase. Skipping DB persist.")
            return growth_reports

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
                        f"₹{r['initial_assets']/10000000:.2f}Cr -> ₹{r['final_assets']/10000000:.2f}Cr "
                        f"(+{r['percentage_increase']}%, CAGR {r['cagr_percent']}%){anomaly_str}"
                    )
            except Exception as e:
                logger.error(f"Failed to upsert CAGR records for {cand_name}: {e}")

        return growth_reports

    async def run(self) -> List[Dict[str, Any]]:
        """Executes full longitudinal wealth analysis across all canonical candidates."""
        logger.info("==========================================================")
        logger.info("Starting Multi-Term Historical Wealth Growth Engine (CAGR)")
        logger.info("==========================================================")

        all_results = []
        for c in CANONICAL_HISTORICAL_FILINGS:
            res = await self.analyze_and_persist(c)
            all_results.extend(res)

        logger.info("==========================================================")
        logger.info(f"🎉 Analysis Complete! Processed {len(all_results)} multi-term wealth intervals.")
        logger.info("==========================================================")
        return all_results


historical_wealth_engine = HistoricalWealthEngine()


if __name__ == "__main__":
    asyncio.run(historical_wealth_engine.run())
