import unittest
from src.verification.indic_phonetics import IndicPhoneticMatcher
from src.verification.legal_classifier import LegalClassifier
from src.verification.conflict_detector import ConflictDetector
from src.verification.mobility_tracker import PoliticalMobilityTracker
from src.ingestion.mospi_mplads import MoSPIMPLADSClient


class TestAdvancedFeatures(unittest.TestCase):

    def test_indic_phonetic_transliteration_matching(self):
        matcher = IndicPhoneticMatcher()

        # 1. Family name variants
        p1, s1 = matcher.encode("Chowdhury")
        p2, s2 = matcher.encode("Choudhary")
        self.assertEqual(p1, "CHDR")
        self.assertEqual(p2, "CHDR")

        p3, s3 = matcher.encode("Modi")
        p4, s4 = matcher.encode("Mody")
        self.assertEqual(p3, "MD")
        self.assertEqual(p4, "MD")

        p5, s5 = matcher.encode("Banerjee")
        p6, s6 = matcher.encode("Bandopadhyay")
        self.assertEqual(p5, "BNRJ")
        self.assertEqual(p6, "BNRJ")

        # 2. Phonetic Jaccard similarity
        sim = matcher.phonetic_similarity("Narendra Modi", "Narendra Mody")
        self.assertGreaterEqual(sim, 0.80)

    def test_legal_classifier_bns_and_section_8_rpa(self):
        classifier = LegalClassifier()

        # Bharatiya Nyaya Sanhita (BNS) Section 103 (Murder)
        res_bns = classifier.classify_charges(["BNS 103", "BNS 189"])
        self.assertTrue(res_bns["is_serious"])
        self.assertIn("Murder (BNS 103)", res_bns["serious_charges_identified"])

        # RPA Section 8 Disqualification on conviction
        eval_convicted = classifier.evaluate_rpa_section_8_disqualification(
            case_type="convicted",
            charges=["IPC 420"],
            charges_framed=True,
            is_convicted=True,
        )
        self.assertTrue(eval_convicted["is_disqualified"])
        self.assertIn("Section 8 of the RPA 1951", eval_convicted["disqualification_reason"])

        # Pending case with framed serious charges -> High scrutiny
        eval_pending = classifier.evaluate_rpa_section_8_disqualification(
            case_type="pending",
            charges=["IPC 302"],
            charges_framed=True,
            is_convicted=False,
        )
        self.assertFalse(eval_pending["is_disqualified"])
        self.assertIn("framed charges", eval_pending["disqualification_reason"])

    def test_conflict_detector_subsisting_contract(self):
        detector = ConflictDetector()

        # Test subsisting check
        self.assertTrue(detector.is_contract_subsisting("2024-01-01", 24))
        self.assertIsNone(detector.is_contract_subsisting(None, None))

        # Test risk determination for public works department
        risk = detector.determine_disqualification_risk(
            candidate_house="Lok Sabha",
            awarding_authority="Public Works Department, Government of Maharashtra",
            is_subsisting=True,
        )
        self.assertEqual(risk, "HIGH")
        self.assertEqual(
            detector.determine_disqualification_risk(
                candidate_house="Lok Sabha",
                awarding_authority="Ministry of Works",
                is_subsisting=None,
            ),
            "REVIEW",
        )

    def test_mobility_tracker_defection_index(self):
        tracker = PoliticalMobilityTracker()
        # 3 transitions over 15 years active
        score = tracker.calculate_defection_index(total_transitions=3, years_active=15)
        self.assertEqual(score, 10.0)

        # 1 transition over 20 years active
        score_low = tracker.calculate_defection_index(total_transitions=1, years_active=20)
        self.assertEqual(score_low, 2.5)

    def test_mplads_statutory_suballocation_audit(self):
        client = MoSPIMPLADSClient()

        # Case 1: Compliant (SC: 16%, ST: 8%)
        res_compliant = client.audit_statutory_suballocations(
            expenditure_amount=100000000.0,
            sc_spent=16000000.0,  # 16% >= 15%
            st_spent=8000000.0,   # 8% >= 7.5%
        )
        self.assertTrue(res_compliant["sc_compliant"])
        self.assertTrue(res_compliant["st_compliant"])
        self.assertFalse(res_compliant["has_statutory_shortfall"])

        # Case 2: Shortfall in SC allocation (SC: 10% < 15%)
        res_shortfall = client.audit_statutory_suballocations(
            expenditure_amount=100000000.0,
            sc_spent=10000000.0,  # 10% < 15%
            st_spent=8000000.0,
        )
        self.assertFalse(res_shortfall["sc_compliant"])
        self.assertTrue(res_shortfall["has_statutory_shortfall"])


if __name__ == "__main__":
    unittest.main()
