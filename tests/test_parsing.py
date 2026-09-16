try:
    import pytest
except ImportError:
    pytest = None
from src.utils.pii_sanitizer import mask_pan, mask_phone, sanitize_text, sanitize_payload
from src.parsing.router import ProcessingTier, DocumentComplexityRouter
from src.parsing.vlm_client import GeminiVLMClient


def test_pii_sanitizer_pan_and_phone():
    assert mask_pan("ABCDE1234F") == "XXXXX1234F"
    assert mask_phone("9876543210") == "XXXXXX3210"
    assert mask_phone("+91-9876543210") == "XXXXXX3210"

    raw_text = "Candidate PAN is ABCDE1234F and mobile number is 9876543210."
    sanitized = sanitize_text(raw_text)
    assert "ABCDE" not in sanitized
    assert "XXXXX1234F" in sanitized
    assert "XXXXXX3210" in sanitized

    payload = {
        "candidate_pan": "ABCDE1234F",
        "mobile_no": "9876543210",
        "description": "Savings account 1234567890 at SBI",
    }
    cleaned = sanitize_payload(payload)
    assert cleaned["candidate_pan"] == "XXXXX1234F"
    assert cleaned["mobile_no"] == "XXXXXX3210"


def test_document_complexity_router():
    router = DocumentComplexityRouter(min_digital_chars=200)

    # 1. Native digital page with sufficient characters
    long_text = "Form 26 affidavit candidate declaration " * 15
    tier = router.route_page(
        page_number=2,
        total_pages=15,
        extracted_text=long_text,
        is_tabular_page=False,
    )
    assert tier == ProcessingTier.TIER_1_DIGITAL

    # 2. Critical Part B summary page with tabular layout
    tier_summary = router.route_page(
        page_number=14,
        total_pages=15,
        extracted_text="Short text",
        is_tabular_page=True,
    )
    assert tier_summary == ProcessingTier.TIER_3_VLM

    # 3. Handwritten page
    tier_handwritten = router.route_page(
        page_number=5,
        total_pages=15,
        extracted_text="",
        has_handwriting_indicator=True,
    )
    assert tier_handwritten == ProcessingTier.TIER_3_VLM


def test_vlm_client_mock_mode():
    client = GeminiVLMClient(api_key="")  # Unconfigured mode
    assert not client.is_configured

    data = client.extract_from_page_image(
        image_bytes=b"fake_jpeg_data",
        page_number=1,
        source_url="https://affidavit.eci.gov.in/test.pdf",
    )
    assert "candidate" in data
    assert data["candidate"]["name"] == "Sample Candidate"
    assert "part_b_summary" in data
    assert data["part_b_summary"]["movable_assets_total"] == 1600000.0


def test_vlm_client_extract_from_pdf():
    client = GeminiVLMClient(api_key="")
    data = client.extract_from_pdf(
        pdf_bytes=b"%PDF-1.4 mock",
        source_url="https://affidavit.eci.gov.in/doc.pdf",
        sha256_hash="abcd1234efgh5678",
    )
    assert data["source_url"] == "https://affidavit.eci.gov.in/doc.pdf"
    assert data["sha256_hash"] == "abcd1234efgh5678"
    assert "candidate" in data
    assert "part_b_summary" in data


def test_extraction_worker_parsing():
    from src.ingestion.extract_affidavits import extraction_worker, parse_clean_float

    assert parse_clean_float("₹ 1,50,000.50") == 150000.50
    assert parse_clean_float("Nil") == 0.0
    assert parse_clean_float("None") == 0.0
    assert parse_clean_float(None) == 0.0

    raw_mock = {
        "candidate": {"name": "Test Candidate", "state": "Gujarat", "constituency": "Surat"},
        "part_a_movable_items": [{"category": "Cash", "self_amount": "250,000"}],
        "part_a_immovable_items": [{"category": "Residential Flat", "self_amount": 1500000.0}],
        "five_year_itr": [{"financial_year": "2023-24", "declared_income": "450000"}],
        "criminal_cases": [{"fir_or_case_number": "123/2020", "statutory_charges": ["IPC 143", "IPC 302"]}],
        "part_b_summary": {"movable_assets_total": 250000.0, "immovable_assets_total": 1500000.0, "liabilities_total": 0.0},
    }

    payload = extraction_worker.parse_extracted_data(
        raw_data=raw_mock,
        source_url="https://test.pdf",
        sha256_hash="hash123",
    )

    assert payload.candidate.name == "Test Candidate"
    assert payload.part_a_movable_items[0].self_amount == 250000.0
    assert payload.part_a_immovable_items[0].self_amount == 1500000.0
    assert len(payload.criminal_cases) == 1
    # Check that IPC 302 was classified as serious
    assert payload.criminal_cases[0].is_serious_category is True

