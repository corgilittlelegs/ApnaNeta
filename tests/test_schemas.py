import unittest
from src.parsing.schemas import (
    BoundingBox,
    CandidateIdentity,
    AssetItem,
    ITRDeclaration,
    CriminalCase,
    PartBSummary,
    Form26AffidavitPayload,
    ForensicAuditResult,
)


class TestSchemas(unittest.TestCase):

    def test_bounding_box_validation(self):
        # Valid bounding box
        bbox = BoundingBox(page=1, ymin=100, xmin=50, ymax=200, xmax=350)
        self.assertEqual(bbox.page, 1)
        self.assertEqual(bbox.ymin, 100)
        self.assertEqual(bbox.xmax, 350)

    def test_form26_payload_structure(self):
        candidate = CandidateIdentity(
            name="Rajesh Kumar",
            state="Uttar Pradesh",
            constituency="Varanasi",
            house="Lok Sabha",
            filing_year=2024,
            proof_bbox=BoundingBox(page=1, ymin=50, xmin=50, ymax=100, xmax=500),
        )

        movable = [
            AssetItem(category="Cash", self_amount=150000.0, spouse_amount=50000.0),
            AssetItem(category="Bank Deposits", self_amount=800000.0, spouse_amount=200000.0),
        ]

        criminal = [
            CriminalCase(
                fir_or_case_number="FIR 102/2021",
                police_station="Civil Lines",
                court_name="CJM Court",
                statutory_charges=["IPC 143", "IPC 188"],
                is_serious_category=False,
                category_justification="Political protest / peaceful demonstration",
            )
        ]

        itr = [
            ITRDeclaration(financial_year="2023-24", declared_income=650000.0),
            ITRDeclaration(financial_year="2022-23", declared_income=580000.0),
        ]

        summary = PartBSummary(
            movable_assets_total=1200000.0,
            immovable_assets_total=5000000.0,
            liabilities_total=200000.0,
        )

        payload = Form26AffidavitPayload(
            source_url="https://affidavit.eci.gov.in/test.pdf",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            candidate=candidate,
            part_a_movable_items=movable,
            five_year_itr=itr,
            criminal_cases=criminal,
            part_b_summary=summary,
        )

        self.assertEqual(payload.candidate.name, "Rajesh Kumar")
        self.assertEqual(len(payload.part_a_movable_items), 2)
        self.assertFalse(payload.criminal_cases[0].is_serious_category)

    def test_forensic_audit_result_logic(self):
        # Simulated audit with a discrepancy
        audit = ForensicAuditResult(
            candidate_name="Rajesh Kumar",
            filing_year=2024,
            constituency="Varanasi",
            part_a_movable_sum=1200000.0,
            part_b_movable_total=1000000.0,
            delta_movable=200000.0,
            part_a_immovable_sum=5000000.0,
            part_b_immovable_total=5000000.0,
            delta_immovable=0.0,
            has_arithmetic_discrepancy=True,
            total_net_worth=6000000.0,
            total_five_year_declared_income=2500000.0,
            wealth_discrepancy_ratio=2.4,
            has_anomalous_wealth_ratio=False,
        )

        self.assertTrue(audit.has_arithmetic_discrepancy)
        self.assertEqual(audit.delta_movable, 200000.0)
        self.assertEqual(audit.wealth_discrepancy_ratio, 2.4)


if __name__ == "__main__":
    unittest.main()
