import unittest
from src.parsing.schemas import (
    Form26AffidavitPayload,
    CandidateIdentity,
    AssetItem,
    ITRDeclaration,
    PartBSummary,
)
from src.verification.math_reconciler import MathReconciler
from src.verification.wealth_analyzer import WealthAnalyzer
from src.verification.legal_classifier import LegalClassifier
from src.verification.entity_resolution import IndicEntityResolver
from src.verification.ecourts_client import ECourtsVerificationClient


class TestVerification(unittest.TestCase):

    def test_double_entry_math_reconciliation(self):
        reconciler = MathReconciler()

        candidate = CandidateIdentity(
            name="Candidate A",
            state="Punjab",
            constituency="Amritsar",
            house="Lok Sabha",
            filing_year=2024,
        )

        # Part A itemized sum = 1,500,000 + 500,000 = 2,000,000
        movable_items = [
            AssetItem(category="Cash", self_amount=500000.0, spouse_amount=0.0),
            AssetItem(category="Bank Deposits", self_amount=1000000.0, spouse_amount=500000.0),
        ]

        # Part B says total is only 1,200,000 -> 800,000 missing!
        summary = PartBSummary(
            movable_assets_total=1200000.0,
            immovable_assets_total=0.0,
            liabilities_total=0.0,
        )

        itr = [ITRDeclaration(financial_year="2023-24", declared_income=500000.0)]

        payload = Form26AffidavitPayload(
            source_url="https://affidavit.eci.gov.in/test.pdf",
            sha256_hash="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            candidate=candidate,
            part_a_movable_items=movable_items,
            part_b_summary=summary,
            five_year_itr=itr,
        )

        result = reconciler.audit_affidavit(payload)
        self.assertTrue(result.has_arithmetic_discrepancy)
        self.assertEqual(result.delta_movable, 800000.0)

    def test_wealth_analyzer_cagr(self):
        analyzer = WealthAnalyzer()
        cagr = analyzer.calculate_cagr(initial_assets=1000000.0, final_assets=4000000.0, years_elapsed=5.0)
        self.assertIsNotNone(cagr)
        self.assertTrue(31.0 < cagr < 33.0)  # Approx 31.95%

    def test_legal_classifier_serious_vs_protest(self):
        classifier = LegalClassifier()

        # Case with serious charge (IPC 302 Murder)
        res_serious = classifier.classify_charges(["IPC 302", "IPC 143", "IPC 188"])
        self.assertTrue(res_serious["is_serious"])
        self.assertEqual(res_serious["category"], "Serious Criminal Offense")

        # Case with only political protest charges (Unlawful Assembly, Disobedience)
        res_protest = classifier.classify_charges(["IPC 143", "IPC 188", "IPC 341"])
        self.assertFalse(res_protest["is_serious"])
        self.assertEqual(res_protest["category"], "Civil Disobedience / Political Agitation")

    def test_indic_entity_resolution(self):
        resolver = IndicEntityResolver()

        cand_2019 = {
            "name": "Shri Arvind Kejriwal",
            "state": "Delhi",
            "filing_year": 2019,
            "age": 50,
        }

        cand_2024 = {
            "name": "Arvind Kejriwal",
            "state": "Delhi",
            "filing_year": 2024,
            "age": 55,
        }

        is_match, score, msg = resolver.is_same_candidate(cand_2019, cand_2024)
        self.assertTrue(is_match)
        self.assertEqual(score, 1.0)

        # Test age mismatch (drifting > 2 years beyond calendar elapsed time)
        cand_fake_age = {
            "name": "Arvind Kejriwal",
            "state": "Delhi",
            "filing_year": 2024,
            "age": 65,  # 15 years older in 5 years!
        }
        is_match_fake, _, msg_fake = resolver.is_same_candidate(cand_2019, cand_fake_age)
        self.assertFalse(is_match_fake)
        self.assertIn("Age drift mismatch", msg_fake)

    def test_ecourts_cnr_is_not_treated_as_docket_evidence(self):
        client = ECourtsVerificationClient()
        self.assertTrue(client.is_valid_cnr("ABCD123456789012"))
        self.assertFalse(client.is_valid_cnr("not-a-cnr"))

        # The explicit evidence API requires a traceable HTTPS source and a
        # retrieval timestamp before it can mark a case as verified.
        self.assertTrue(hasattr(client, "record_official_docket_evidence"))


if __name__ == "__main__":
    unittest.main()
