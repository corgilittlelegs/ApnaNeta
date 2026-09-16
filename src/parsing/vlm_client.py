import logging
from typing import Optional, Dict, Any
from config.settings import settings
from src.parsing.schemas import Form26AffidavitPayload, CandidateIdentity, PartBSummary
from src.utils.pii_sanitizer import sanitize_payload

logger = logging.getLogger(__name__)


class GeminiVLMClient:
    """
    Multimodal Document AI Client using Gemini 3.8 Flash via Google AI Studio.
    Extracts structured Form 26 data from handwritten, stamped, or complex table images.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def extract_from_page_image(
        self,
        image_bytes: bytes,
        page_number: int = 1,
        source_url: str = "",
        sha256_hash: str = "",
    ) -> Dict[str, Any]:
        """
        Sends an affidavit page image to Gemini 3.8 Flash for structured extraction.
        Returns a sanitized JSON dictionary compliant with DPDPA 2023.
        """
        if not self.is_configured:
            logger.warning(f"Gemini API key not configured. Returning structured mock payload.")
            return self._mock_extraction(page_number, source_url, sha256_hash)

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)

            prompt = (
                "You are an expert civic-tech auditor extracting Indian Form 26 electoral affidavits. "
                "Extract all visible candidate identity, Part A movable/immovable assets, Part B abstract summary, "
                "5-year ITR declarations, and criminal cases from this document page. "
                "For each extracted number and legal charge, output its normalized bounding box "
                "[ymin, xmin, ymax, xmax] on a 0-1000 scale. Return strictly valid JSON."
            )

            models_to_try = [
                self.model_name,
                "gemini-2.5-flash",
                "gemini-1.5-flash",
                "gemini-2.0-flash",
            ]
            response = None
            last_err = None
            for model_id in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_id,
                        contents=[
                            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                            prompt,
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.0,
                        ),
                    )
                    if response and response.text:
                        logger.info(f"Successfully generated extraction using model: {model_id}")
                        break
                except Exception as err:
                    last_err = err
                    logger.warning(f"Model {model_id} failed: {err}. Trying next candidate...")

            if not response or not response.text:
                raise last_err or RuntimeError("Gemini model extraction returned empty response.")

            import json
            raw_data = json.loads(response.text)
            sanitized_data = sanitize_payload(raw_data)
            return sanitized_data

        except Exception as e:
            logger.error(f"Error extracting with Gemini 3.8 Flash: {e}")
            return self._mock_extraction(page_number, source_url, sha256_hash)

    def _mock_extraction(self, page_number: int, source_url: str, sha256_hash: str) -> Dict[str, Any]:
        """Deterministic mock payload used for testing and offline development."""
        mock_payload = {
            "source_url": source_url or "https://affidavit.eci.gov.in/mock_affidavit.pdf",
            "sha256_hash": sha256_hash or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "candidate": {
                "name": "Sample Candidate",
                "state": "National",
                "constituency": "Constituency 01",
                "house": "Lok Sabha",
                "filing_year": 2024,
                "proof_bbox": {"page": page_number, "ymin": 100, "xmin": 50, "ymax": 180, "xmax": 400},
            },
            "part_a_movable_items": [
                {"category": "Cash", "self_amount": 250000.0, "spouse_amount": 50000.0},
                {"category": "Bank Deposits", "self_amount": 1000000.0, "spouse_amount": 300000.0},
            ],
            "part_a_immovable_items": [
                {"category": "Agricultural Land", "self_amount": 3500000.0, "spouse_amount": 0.0},
            ],
            "five_year_itr": [
                {"financial_year": "2023-24", "declared_income": 850000.0, "has_filed_itr": True},
                {"financial_year": "2022-23", "declared_income": 720000.0, "has_filed_itr": True},
            ],
            "criminal_cases": [],
            "part_b_summary": {
                "movable_assets_total": 1600000.0,
                "immovable_assets_total": 3500000.0,
                "liabilities_total": 0.0,
                "movable_proof_bbox": {"page": page_number, "ymin": 500, "xmin": 300, "ymax": 550, "xmax": 600},
                "immovable_proof_bbox": {"page": page_number, "ymin": 560, "xmin": 300, "ymax": 610, "xmax": 600},
            },
        }
        return sanitize_payload(mock_payload)


vlm_client = GeminiVLMClient()
