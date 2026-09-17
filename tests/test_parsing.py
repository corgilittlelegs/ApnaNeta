import unittest
from src.utils.pii_sanitizer import mask_pan, mask_phone, sanitize_text, sanitize_payload
from src.parsing.router import ProcessingTier, DocumentComplexityRouter
from src.parsing.vlm_client import GeminiVLMClient


class TestParsing(unittest.TestCase):

    def test_pii_sanitizer_pan_and_phone(self):
        self.assertEqual(mask_pan("ABCDE1234F"), "XXXXX1234F")
        self.assertEqual(mask_phone("9876543210"), "XXXXXX3210")
        self.assertEqual(mask_phone("+91-9876543210"), "XXXXXX3210")

        raw_text = "Candidate PAN is ABCDE1234F and mobile number is 9876543210."
        sanitized = sanitize_text(raw_text)
        self.assertNotIn("ABCDE", sanitized)
        self.assertIn("XXXXX1234F", sanitized)
        self.assertIn("XXXXXX3210", sanitized)

        payload = {
            "candidate_pan": "ABCDE1234F",
            "mobile_no": "9876543210",
            "description": "Savings account 1234567890 at SBI",
        }
        cleaned = sanitize_payload(payload)
        self.assertEqual(cleaned["candidate_pan"], "XXXXX1234F")
        self.assertEqual(cleaned["mobile_no"], "XXXXXX3210")

    def test_document_complexity_router(self):
        router = DocumentComplexityRouter(min_digital_chars=200)

        # 1. Native digital page with sufficient characters
        long_text = "Form 26 affidavit candidate declaration " * 15
        tier = router.route_page(
            page_number=2,
            total_pages=15,
            extracted_text=long_text,
            is_tabular_page=False,
        )
        self.assertEqual(tier, ProcessingTier.TIER_1_DIGITAL)

        # 2. Critical Part B summary page with tabular layout
        tier_summary = router.route_page(
            page_number=14,
            total_pages=15,
            extracted_text="Short text",
            is_tabular_page=True,
        )
        self.assertEqual(tier_summary, ProcessingTier.TIER_3_VLM)

        # 3. Handwritten page
        tier_handwritten = router.route_page(
            page_number=5,
            total_pages=15,
            extracted_text="",
            has_handwriting_indicator=True,
        )
        self.assertEqual(tier_handwritten, ProcessingTier.TIER_3_VLM)

    def test_vlm_client_unconfigured_strictly_raises_error(self):
        """Zero-placeholder enforcement: unconfigured VLM must raise RuntimeError rather than generating fake data."""
        client = GeminiVLMClient(api_key="")
        self.assertFalse(client.is_configured)
        with self.assertRaises(RuntimeError):
            client.extract_from_page_image(
                image_bytes=b"fake_jpeg_data",
                page_number=1,
                source_url="https://affidavit.eci.gov.in/test.pdf",
            )

    def test_extraction_worker_parsing(self):
        from src.ingestion.extract_affidavits import extraction_worker, parse_clean_float

        self.assertEqual(parse_clean_float("₹ 1,50,000.50"), 150000.50)
        self.assertEqual(parse_clean_float("Nil"), 0.0)
        self.assertEqual(parse_clean_float("None"), 0.0)
        self.assertEqual(parse_clean_float(None), 0.0)

        raw_data = {
            "candidate": {"name": "Test Candidate", "state": "Gujarat", "constituency": "Surat"},
            "part_a_movable_items": [{"category": "Cash", "self_amount": "250,000"}],
            "part_a_immovable_items": [{"category": "Residential Flat", "self_amount": 1500000.0}],
            "five_year_itr": [{"financial_year": "2023-24", "declared_income": "450000"}],
            "criminal_cases": [{"fir_or_case_number": "123/2020", "statutory_charges": ["IPC 143", "IPC 302"]}],
            "part_b_summary": {"movable_assets_total": 250000.0, "immovable_assets_total": 1500000.0, "liabilities_total": 0.0},
        }

        payload = extraction_worker.parse_extracted_data(
            raw_data=raw_data,
            source_url="https://test.pdf",
            sha256_hash="hash123",
        )

        self.assertEqual(payload.candidate.name, "Test Candidate")
        self.assertEqual(payload.part_a_movable_items[0].self_amount, 250000.0)
        self.assertEqual(payload.part_a_immovable_items[0].self_amount, 1500000.0)
        self.assertEqual(len(payload.criminal_cases), 1)
        # Check that IPC 302 was classified as serious
        self.assertTrue(payload.criminal_cases[0].is_serious_category)


if __name__ == "__main__":
    unittest.main()

