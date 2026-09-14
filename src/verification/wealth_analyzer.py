import logging
import math
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class WealthAnalyzer:
    """
    Computes multi-term wealth accumulation metrics across consecutive election filings.
    Calculates Compound Annual Growth Rate (CAGR) and percentage asset surges.
    """

    def calculate_cagr(
        self, initial_assets: float, final_assets: float, years_elapsed: float
    ) -> Optional[float]:
        """
        Computes Compound Annual Growth Rate (CAGR) as a percentage.
        CAGR = ((Final / Initial) ** (1 / n)) - 1
        """
        if initial_assets <= 0 or final_assets <= 0 or years_elapsed <= 0:
            return None
        try:
            ratio = final_assets / initial_assets
            cagr = (math.pow(ratio, 1.0 / years_elapsed) - 1.0) * 100.0
            return round(cagr, 2)
        except (ValueError, ZeroDivisionError) as e:
            logger.warning(f"Error computing CAGR: {e}")
            return None

    def analyze_longitudinal_growth(
        self, candidate_name: str, filings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Takes a list of chronologically sorted historical filings for a candidate:
        [
          {"year": 2014, "total_assets": 15000000.0},
          {"year": 2019, "total_assets": 85000000.0},
          {"year": 2024, "total_assets": 320000000.0}
        ]
        Returns step-wise growth rates and CAGR analysis.
        """
        if len(filings) < 2:
            return []

        # Ensure chronological order
        sorted_filings = sorted(filings, key=lambda f: f["year"])
        growth_reports: List[Dict[str, Any]] = []

        for i in range(len(sorted_filings) - 1):
            prior = sorted_filings[i]
            current = sorted_filings[i + 1]

            prior_assets = prior.get("total_assets", 0.0)
            current_assets = current.get("total_assets", 0.0)
            years_diff = current["year"] - prior["year"]

            if prior_assets > 0 and years_diff > 0:
                abs_increase = current_assets - prior_assets
                pct_increase = round((abs_increase / prior_assets) * 100.0, 2)
                cagr = self.calculate_cagr(prior_assets, current_assets, years_diff)

                growth_reports.append(
                    {
                        "candidate_name": candidate_name,
                        "from_year": prior["year"],
                        "to_year": current["year"],
                        "initial_assets": prior_assets,
                        "final_assets": current_assets,
                        "absolute_increase": round(abs_increase, 2),
                        "percentage_increase": pct_increase,
                        "cagr_percent": cagr,
                        "is_rapid_accumulation": pct_increase >= 300.0,  # 300%+ increase
                    }
                )

        return growth_reports


wealth_analyzer = WealthAnalyzer()
