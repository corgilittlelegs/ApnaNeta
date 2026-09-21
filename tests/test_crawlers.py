import unittest
from src.ingestion.esakshi_crawler import ESAKSHISessionCrawler
from src.ingestion.eci_crawler import ECIPlaywrightCrawler
from src.ingestion.mospi_mplads import MoSPIMPLADSClient


class TestCrawlers(unittest.TestCase):
    def setUp(self):
        self.esakshi = ESAKSHISessionCrawler()
        self.eci = ECIPlaywrightCrawler()
        self.mplads = MoSPIMPLADSClient()

    def test_esakshi_work_parsing(self):
        raw_work = {
            "work_id": "UP-VAR-2023-0881",
            "work_title": "Construction of Deep Borewell and RO Drinking Water Plant",
            "sector": "Drinking Water",
            "sanctioned_amount": 1500000.0,
            "expenditure_amount": 1485000.0,
            "status": "Completed",
            "lat": 25.3176,
            "lng": 82.9739,
            "sc_st_category": "SC (15%)",
            "completion_date": "2023-11-20",
        }

        parsed = self.esakshi.parse_work_record(raw_work, candidate_id="test-candidate-123")
        self.assertEqual(parsed["work_id"], "UP-VAR-2023-0881")
        self.assertEqual(parsed["candidate_id"], "test-candidate-123")
        self.assertEqual(parsed["sanctioned_amount"], 1500000.0)
        self.assertEqual(parsed["latitude"], 25.3176)
        self.assertEqual(parsed["longitude"], 82.9739)
        self.assertEqual(parsed["sc_st_category"], "SC (15%)")
        self.assertFalse(parsed["gis_verified"])

    def test_esakshi_missing_coordinates(self):
        raw_work = {
            "id": "DL-NEW-2024-0012",
            "description": "Installation of LED Street Lighting",
            "sanctioned_amount": "500000",
        }
        parsed = self.esakshi.parse_work_record(raw_work, candidate_id="test-mp-456")
        self.assertEqual(parsed["work_id"], "DL-NEW-2024-0012")
        self.assertIsNone(parsed["latitude"])
        self.assertIsNone(parsed["longitude"])
        self.assertEqual(parsed["sanctioned_amount"], 500000.0)

    def test_mplads_clean_numeric(self):
        # Value in Crores (<= 500) converted to INR
        self.assertEqual(self.mplads.clean_numeric("25.0"), 250000000.0)
        self.assertEqual(self.mplads.clean_numeric("17.50"), 175000000.0)
        # Value in Rupees with commas
        self.assertEqual(self.mplads.clean_numeric("25,00,00,000"), 250000000.0)
        # None and empty
        self.assertEqual(self.mplads.clean_numeric(None), 0.0)
        self.assertEqual(self.mplads.clean_numeric(""), 0.0)

    def test_mplads_clean_percentage(self):
        # Direct percentage
        self.assertEqual(self.mplads.clean_percentage("88.5", 175000000, 200000000), 88.5)
        # Ratio <= 1.0 converted to percentage
        self.assertEqual(self.mplads.clean_percentage("0.85", 175000000, 200000000), 85.0)
        # Fallback calculation
        self.assertEqual(self.mplads.clean_percentage(None, 150000000, 200000000), 75.0)

    def test_mplads_velocity_and_suballocations(self):
        vel = self.mplads.calculate_expenditure_velocity(150000000, 200000000)
        self.assertEqual(vel, 75.0)

        # SC 15%, ST 7.5% compliance
        audit = self.mplads.audit_statutory_suballocations(
            expenditure_amount=100000000,
            sc_spent=16000000,  # 16% >= 15%
            st_spent=8000000,   # 8% >= 7.5%
        )
        self.assertTrue(audit["sc_compliant"])
        self.assertTrue(audit["st_compliant"])
        self.assertFalse(audit["has_statutory_shortfall"])


if __name__ == "__main__":
    unittest.main()

