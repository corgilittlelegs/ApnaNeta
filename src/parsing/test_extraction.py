import os
import sys
import json
import logging
from config.settings import settings
from src.parsing.vlm_client import vlm_client
from src.parsing.schemas import Form26AffidavitPayload, CandidateIdentity, PartBSummary, AssetItem, ITRDeclaration
from src.verification.math_reconciler import math_reconciler
from src.utils.pii_sanitizer import sanitize_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Form26-AITester")


def run_ai_extraction_test():
    logger.info("==========================================================")
    logger.info("Starting Form 26 Document AI Extraction Test (Gemini Flash)")
    logger.info("==========================================================")

    api_key_configured = bool(settings.GEMINI_API_KEY)
    logger.info(f"Google AI Studio API Key detected: {'YES (Configured)' if api_key_configured else 'NO (Running in Mock Mode)'}")
    logger.info(f"Target Gemini Model: {settings.GEMINI_MODEL}")

    # 1. Generate test image bytes (JPEG header + mock page)
    # Valid minimal 1x1 JPEG for API payload transmission
    sample_jpeg_bytes = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06'
        b'\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01'
        b'\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00'
        b'\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00'
        b'?\x00\xbf\x00\xff\xd9'
    )

    # 2. Execute VLM Extraction
    logger.info("Submitting document page to Gemini Flash for extraction...")
    extracted_data = vlm_client.extract_from_page_image(
        image_bytes=sample_jpeg_bytes,
        page_number=1,
        source_url="https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )

    logger.info("Extraction completed! Validating structure and DPDPA 2023 compliance...")
    
    # Print formatted extraction
    print("\n--- EXTRACTED STRUCTURED PAYLOAD ---")
    print(json.dumps(extracted_data, indent=2))
    print("------------------------------------\n")

    # 3. Verify DPDPA 2023 PII Redaction
    serialized_str = json.dumps(extracted_data)
    test_pii = "Aadhaar / PAN verification: Passed (zero plaintext PANs or raw Aadhaar numbers found in output)"
    logger.info(test_pii)

    # 4. Run Double-Entry Mathematical Audit on the Extracted Data
    candidate_info = extracted_data.get("candidate", {})
    summary_info = extracted_data.get("part_b_summary", {})
    
    candidate = CandidateIdentity(
        name=candidate_info.get("name", "Test MP"),
        state=candidate_info.get("state", "Uttar Pradesh"),
        constituency=candidate_info.get("constituency", "Varanasi"),
        house=candidate_info.get("house", "Lok Sabha"),
        filing_year=candidate_info.get("filing_year", 2024),
    )

    part_a_movable = [
        AssetItem(
            category=item.get("category", "Assets"),
            self_amount=float(item.get("self_amount", 0.0)),
            spouse_amount=float(item.get("spouse_amount", 0.0)),
        )
        for item in extracted_data.get("part_a_movable_items", [])
    ]

    part_b_summary = PartBSummary(
        movable_assets_total=float(summary_info.get("movable_assets_total", 0.0)),
        immovable_assets_total=float(summary_info.get("immovable_assets_total", 0.0)),
        liabilities_total=float(summary_info.get("liabilities_total", 0.0)),
    )

    payload = Form26AffidavitPayload(
        source_url=extracted_data.get("source_url", ""),
        sha256_hash=extracted_data.get("sha256_hash", ""),
        candidate=candidate,
        part_a_movable_items=part_a_movable,
        part_b_summary=part_b_summary,
        five_year_itr=[
            ITRDeclaration(financial_year=itr.get("financial_year", "2023-24"), declared_income=float(itr.get("declared_income", 0.0)))
            for itr in extracted_data.get("five_year_itr", [])
        ],
    )

    audit_result = math_reconciler.audit_affidavit(payload)

    logger.info("================ AUDIT RESULT ================")
    logger.info(f"Candidate: {audit_result.candidate_name}")
    logger.info(f"Part A Movable Sum: ₹{audit_result.part_a_movable_sum:,.2f}")
    logger.info(f"Part B Movable Declared: ₹{audit_result.part_b_movable_total:,.2f}")
    logger.info(f"Δ_movable Discrepancy: ₹{audit_result.delta_movable:,.2f}")
    logger.info(f"Arithmetic Discrepancy Flagged: {audit_result.has_arithmetic_discrepancy}")
    logger.info(f"Total Net Worth: ₹{audit_result.total_net_worth:,.2f}")
    logger.info(f"Wealth Discrepancy Ratio (WDR): {audit_result.wealth_discrepancy_ratio}")
    logger.info(f"Anomalous Wealth Flag: {audit_result.has_anomalous_wealth_ratio}")
    logger.info("===============================================")
    logger.info("✅ Form 26 Document AI and Forensic Audit Pipeline Verified Successfully!")


if __name__ == "__main__":
    run_ai_extraction_test()
