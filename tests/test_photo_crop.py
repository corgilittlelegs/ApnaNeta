import unittest
from src.parsing.schemas import BoundingBox, CandidateIdentity
from src.ingestion.extract_affidavits import crop_candidate_photo


class TestPhotoCrop(unittest.TestCase):

    def test_candidate_identity_with_photo_bbox(self):
        bbox = BoundingBox(page=1, ymin=50, xmin=700, ymax=250, xmax=950)
        cand = CandidateIdentity(
            name="Sovereign Candidate",
            state="Maharashtra",
            constituency="Mumbai South",
            house="Lok Sabha",
            filing_year=2024,
            photo_bbox=bbox,
        )
        self.assertIsNotNone(cand.photo_bbox)
        self.assertEqual(cand.photo_bbox.page, 1)
        self.assertEqual(cand.photo_bbox.ymin, 50)
        self.assertEqual(cand.photo_bbox.xmax, 950)

    def test_crop_candidate_photo_with_synthetic_pdf(self):
        try:
            import fitz  # PyMuPDF
        except ImportError:
            self.skipTest("PyMuPDF (fitz) not installed in local test environment (installed in CI workflow)")

        # Create a synthetic 1-page PDF
        doc = fitz.open()
        page = doc.new_page(width=595, height=842) # A4 size
        rect = fitz.Rect(400, 50, 550, 200)
        page.draw_rect(rect, color=(0.8, 0.2, 0.2), fill=(0.2, 0.5, 0.8))
        pdf_bytes = doc.tobytes()
        doc.close()

        photo_bbox = BoundingBox(
            page=1,
            ymin=int((50 / 842) * 1000),
            xmin=int((400 / 595) * 1000),
            ymax=int((200 / 842) * 1000),
            xmax=int((550 / 595) * 1000),
        )

        cropped_bytes = crop_candidate_photo(pdf_bytes, photo_bbox)
        self.assertIsNotNone(cropped_bytes)
        self.assertTrue(len(cropped_bytes) > 100)
        self.assertTrue(cropped_bytes.startswith(b"\xff\xd8\xff"))
        # Check JPEG magic bytes: \xff\xd8\xff
        self.assertTrue(cropped_bytes.startswith(b"\xff\xd8\xff"))

    def test_crop_candidate_photo_invalid_inputs(self):
        # Empty pdf_bytes or empty bbox should safely return None
        self.assertIsNone(crop_candidate_photo(b"", None))
        self.assertIsNone(crop_candidate_photo(b"not-a-pdf", BoundingBox(page=1, ymin=0, xmin=0, ymax=10, xmax=10)))


if __name__ == "__main__":
    unittest.main()
