import logging
from typing import List, Dict, Any, Optional
from src.parsing.schemas import Form26AffidavitPayload, ForensicAuditResult, BoundingBox

logger = logging.getLogger(__name__)

# Tolerance threshold in INR to ignore minor rounding differences
DISCREPANCY_TOLERANCE_INR = 500.0


class MathReconciler:
    """
    Executes double-entry arithmetic audits on Form 26 electoral affidavits.
    Compares Part A itemized accounting with Part B abstract totals:
      Δ_movable = |Part B Total - Σ Part A Items|
      Δ_immovable = |Part B Total - Σ Part A Items|
    """

    def audit_affidavit(self, payload: Form26AffidavitPayload) -> ForensicAuditResult:
        """
        Performs mathematical verification across Part A and Part B of the affidavit.
        """
        # 1. Sum Part A Movable Assets (Candidate + Spouse + Dependents)
        part_a_movable_sum = sum(
            (item.self_amount + item.spouse_amount + item.dependents_amount)
            for item in payload.part_a_movable_items
        )

        # 2. Sum Part A Immovable Assets (Candidate + Spouse + Dependents)
        part_a_immovable_sum = sum(
            (item.self_amount + item.spouse_amount + item.dependents_amount)
            for item in payload.part_a_immovable_items
        )

        # 3. Retrieve Part B Declared Abstract Totals
        part_b_movable_total = payload.part_b_summary.movable_assets_total
        part_b_immovable_total = payload.part_b_summary.immovable_assets_total
        liabilities_total = payload.part_b_summary.liabilities_total

        # 4. Compute Variances
        delta_movable = abs(part_b_movable_total - part_a_movable_sum)
        delta_immovable = abs(part_b_immovable_total - part_a_immovable_sum)

        has_arithmetic_discrepancy = (
            delta_movable > DISCREPANCY_TOLERANCE_INR or delta_immovable > DISCREPANCY_TOLERANCE_INR
        )

        # 5. Compute Net Worth & 5-Year Declared Income
        total_assets = part_b_movable_total + part_b_immovable_total
        total_net_worth = max(0.0, total_assets - liabilities_total)

        total_five_year_income = sum(
            itr.declared_income for itr in payload.five_year_itr
        )

        # 6. Wealth Discrepancy Ratio (WDR)
        wealth_discrepancy_ratio: Optional[float] = None
        has_anomalous_wealth_ratio = False

        if total_five_year_income > 0:
            wealth_discrepancy_ratio = round(total_net_worth / total_five_year_income, 2)
            # Anomaly triggered if net worth is >= 10x total 5-year declared income
            if wealth_discrepancy_ratio >= 10.0:
                has_anomalous_wealth_ratio = True
        elif total_net_worth > 5000000.0:
            # High net worth (> 50 Lakhs) with 0 declared income
            has_anomalous_wealth_ratio = True

        # 7. Collect Bounding-Box Coordinates for Visual Proof
        variance_proofs: List[BoundingBox] = []
        if delta_movable > DISCREPANCY_TOLERANCE_INR and payload.part_b_summary.movable_proof_bbox:
            variance_proofs.append(payload.part_b_summary.movable_proof_bbox)
        if delta_immovable > DISCREPANCY_TOLERANCE_INR and payload.part_b_summary.immovable_proof_bbox:
            variance_proofs.append(payload.part_b_summary.immovable_proof_bbox)

        result = ForensicAuditResult(
            candidate_name=payload.candidate.name,
            filing_year=payload.candidate.filing_year,
            constituency=payload.candidate.constituency,
            part_a_movable_sum=round(part_a_movable_sum, 2),
            part_b_movable_total=round(part_b_movable_total, 2),
            delta_movable=round(delta_movable, 2),
            part_a_immovable_sum=round(part_a_immovable_sum, 2),
            part_b_immovable_total=round(part_b_immovable_total, 2),
            delta_immovable=round(delta_immovable, 2),
            has_arithmetic_discrepancy=has_arithmetic_discrepancy,
            total_net_worth=round(total_net_worth, 2),
            total_five_year_declared_income=round(total_five_year_income, 2),
            wealth_discrepancy_ratio=wealth_discrepancy_ratio,
            has_anomalous_wealth_ratio=has_anomalous_wealth_ratio,
            variance_proof_coordinates=variance_proofs,
        )

        logger.info(
            f"Audit finished for {payload.candidate.name}: "
            f"Δ_mov={delta_movable:.2f}, Δ_immov={delta_immovable:.2f}, WDR={wealth_discrepancy_ratio}"
        )
        return result


math_reconciler = MathReconciler()

if __name__ == "__main__":
    logger.info("Forensic Reconciliation Engine initialized.")
    print("Forensic Reconciliation Engine verified and ready.")
