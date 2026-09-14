import pytest
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
