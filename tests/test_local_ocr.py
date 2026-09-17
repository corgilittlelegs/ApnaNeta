import unittest
from src.parsing.local_ocr import LocalOCREngine
from src.parsing.router import DocumentComplexityRouter, ProcessingTier


class TestLocalOCR(unittest.TestCase):
    def setUp(self):
        self.ocr = LocalOCREngine()
        self.router = DocumentComplexityRouter()

    def test_coordinate_normalization_0_to_1000(self):
        # Coordinates on an A4 page (595 x 842 points)
        # Box: ymin=100, xmin=50, ymax=200, xmax=300
        box = [100.0, 50.0, 200.0, 300.0]
        norm = self.ocr.normalize_coordinates(box, page_width=595.0, page_height=842.0)

        # Expected:
        # ymin = round(100 / 842 * 1000) = 119
        # xmin = round(50 / 595 * 1000) = 84
        # ymax = round(200 / 842 * 1000) = 238
        # xmax = round(300 / 595 * 1000) = 504
        self.assertEqual(norm.ymin, 119)
        self.assertEqual(norm.xmin, 84)
        self.assertEqual(norm.ymax, 238)
        self.assertEqual(norm.xmax, 504)
        self.assertTrue(0 <= norm.ymin <= 1000)
        self.assertTrue(0 <= norm.xmin <= 1000)

    def test_extract_form26_fields_from_tokens(self):
        tokens = [
            {"text": "PAN: ABCDE1234F", "confidence": 0.98},
            {"text": "Total Movable Assets: 25,00,000", "confidence": 0.95},
            {"text": "Total Immovable Assets: 1,50,00,000", "confidence": 0.92},
        ]
        fields = self.ocr.extract_form26_fields(tokens)
        self.assertEqual(fields["pan"], "ABCDE1234F")
        self.assertEqual(fields["movable_assets_total"], 2500000.0)
        self.assertEqual(fields["immovable_assets_total"], 15000000.0)

    def test_router_tier_2_dispatch(self):
        res = self.router.process_tier_page(
            tier=ProcessingTier.TIER_2_SCAN,
            page_image_bytes=b"",
        )
        self.assertEqual(res["tier"], ProcessingTier.TIER_2_SCAN.value)
        self.assertIn("tokens", res)
        self.assertIn("fields", res)


if __name__ == "__main__":
    unittest.main()
