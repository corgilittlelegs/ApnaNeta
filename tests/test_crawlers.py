import unittest
from src.ingestion.esakshi_crawler import ESAKSHISessionCrawler
from src.ingestion.eci_crawler import ECIPlaywrightCrawler


class TestCrawlers(unittest.TestCase):
    def setUp(self):
        self.esakshi = ESAKSHISessionCrawler()
        self.eci = ECIPlaywrightCrawler()

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


if __name__ == "__main__":
    unittest.main()
