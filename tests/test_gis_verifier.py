import unittest
from src.verification.gis_verifier import MPLADSGISVerifier, haversine_distance_meters


class TestGISVerifier(unittest.TestCase):
    def setUp(self):
        self.verifier = MPLADSGISVerifier()

    def test_haversine_distance(self):
        # Two points separated by ~111 meters along latitude
        dist = haversine_distance_meters(25.3176, 82.9739, 25.3186, 82.9739)
        self.assertAlmostEqual(dist, 111.2, delta=2.0)

    def test_constituency_boundary_check(self):
        # Varanasi coordinates: ~25.3176, 82.9739 (Valid)
        valid, _ = self.verifier.check_constituency_boundary(25.3176, 82.9739, "Varanasi")
        self.assertTrue(valid)

        # Coordinate in Mumbai (~19.07, 72.87) checked against Varanasi (Invalid)
        invalid, note = self.verifier.check_constituency_boundary(19.07, 72.87, "Varanasi")
        self.assertFalse(invalid)
        self.assertIn("fall outside", note)

    def test_detect_duplicate_coordinates(self):
        works = [
            {"work_id": "W1", "latitude": 25.317600, "longitude": 82.973900},
            {"work_id": "W2", "latitude": 25.317605, "longitude": 82.973905}, # ~0.7m away
            {"work_id": "W3", "latitude": 25.350000, "longitude": 82.990000}, # Far away
        ]
        duplicates = self.verifier.detect_duplicate_coordinates(works, distance_threshold_meters=15.0)
        self.assertIn("W1", duplicates)
        self.assertIn("W2", duplicates["W1"])
        self.assertNotIn("W3", duplicates)

    def test_ghost_project_risk_critical_duplicate(self):
        work = {
            "work_id": "W1",
            "sanctioned_amount": 1000000.0,
            "expenditure_amount": 1000000.0,
            "status": "Completed",
            "latitude": 25.3176,
            "longitude": 82.9739,
        }
        risk = self.verifier.evaluate_ghost_project_risk(work, is_duplicate=True, is_boundary_valid=True)
        self.assertEqual(risk["ghost_project_risk"], "CRITICAL")
        self.assertGreaterEqual(risk["risk_score"], 0.9)

    def test_ghost_project_risk_low_verified(self):
        work = {
            "work_id": "W4",
            "sanctioned_amount": 500000.0,
            "expenditure_amount": 500000.0,
            "status": "Completed",
            "latitude": 25.3176,
            "longitude": 82.9739,
        }
        risk = self.verifier.evaluate_ghost_project_risk(work, is_duplicate=False, is_boundary_valid=True)
        self.assertEqual(risk["ghost_project_risk"], "LOW")
        self.assertEqual(risk["risk_score"], 0.1)


if __name__ == "__main__":
    unittest.main()
