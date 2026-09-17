import unittest
import os
from src.utils.pii_sanitizer import sanitize_text, sanitize_payload, mask_aadhaar, mask_bank_account
from src.ingestion.eci_affidavits import is_allowed_pdf_url
from src.parsing.digital_parser import digital_parser


class TestSecurityRemediations(unittest.TestCase):

    def test_sec_04_pii_sanitizer_aadhaar_and_bank(self):
        # Aadhaar masking
        self.assertEqual(mask_aadhaar("2345 6789 0123"), "XXXXXXXX0123")
        self.assertEqual(mask_aadhaar("234567890123"), "XXXXXXXX0123")

        # Bank account masking
        self.assertEqual(mask_bank_account("12345678901"), "XXXXXXX8901")

        # Mixed text sanitization
        text = "Deponent PAN: ABCDE1234F, Aadhaar: 2345 6789 0123, Phone: 9876543210, Account: 123456789012"
        sanitized = sanitize_text(text)
        self.assertNotIn("ABCDE1234F", sanitized)
        self.assertIn("XXXXX1234F", sanitized)
        self.assertNotIn("2345 6789 0123", sanitized)
        self.assertIn("XXXXXXXX0123", sanitized)
        self.assertNotIn("9876543210", sanitized)
        self.assertIn("XXXXXX3210", sanitized)
        self.assertNotIn("123456789012", sanitized)
        self.assertIn("XXXXXXXX9012", sanitized)

    def test_sec_05_ssrf_validation(self):
        # Valid official ECI domains
        self.assertTrue(is_allowed_pdf_url("https://affidavit.eci.gov.in/show-file/affidavit.pdf"))
        self.assertTrue(is_allowed_pdf_url("https://eci.gov.in/files/candidate.pdf"))
        self.assertTrue(is_allowed_pdf_url("https://affidavitresults.eci.gov.in/data.pdf"))

        # Blocked malicious / private endpoints (SSRF)
        self.assertFalse(is_allowed_pdf_url("http://127.0.0.1:8000/secret.pdf"))
        self.assertFalse(is_allowed_pdf_url("http://localhost:5000/dump"))
        self.assertFalse(is_allowed_pdf_url("http://169.254.169.254/latest/meta-data/"))
        self.assertFalse(is_allowed_pdf_url("https://evil.com/fake_affidavit.pdf"))
        self.assertFalse(is_allowed_pdf_url("file:///etc/passwd"))
        self.assertFalse(is_allowed_pdf_url("javascript:alert(1)"))
        self.assertFalse(is_allowed_pdf_url(""))

    def test_sec_07_pdf_parser_security_guards(self):
        # Rejects non-PDF header bytes
        res_invalid = digital_parser.extract_page_text_and_blocks(b"RANDOM_BYTES_NOT_A_PDF", 1)
        self.assertIn("error", res_invalid)
        self.assertEqual(res_invalid["total_pages"], 0)

        # Empty stream
        res_empty = digital_parser.extract_page_text_and_blocks(b"", 1)
        self.assertEqual(res_empty["total_pages"], 0)

    def test_sec_02_schema_least_privilege(self):
        schema_path = os.path.join(os.path.dirname(__file__), "..", "src", "storage", "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Ensure REVOKE ALL FROM anon exists
        self.assertIn("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;", content)
        # Ensure GRANT SELECT TO anon exists
        self.assertIn("GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon", content)
        # Ensure service_role has ALL
        self.assertIn("GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;", content)


if __name__ == "__main__":
    unittest.main()
