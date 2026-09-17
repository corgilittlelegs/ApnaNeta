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
            raise RuntimeError("GEMINI_API_KEY is not configured. An official Google AI Studio key is required for verified document extraction.")

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

            models_to_try = []
            for m in [self.model_name, "gemini-3.8-flash", "gemini-3.6-flash"]:
                if m and m not in models_to_try:
                    models_to_try.append(m)

            response = None
            last_err = None
            import time

            for model_id in models_to_try:
                for attempt in range(3):
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
                        err_str = str(err)
                        if ("503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str) and attempt < 2:
                            wait_time = (attempt + 1) * 2.5
                            logger.warning(f"Model {model_id} hit 503 demand spike. Retrying in {wait_time:.1f}s (attempt {attempt + 1}/3)...")
                            time.sleep(wait_time)
                        else:
                            logger.warning(f"Model {model_id} failed: {err}. Trying next fallback...")
                            break
                if response and response.text:
                    break

            if not response or not response.text:
                raise last_err or RuntimeError("Gemini model extraction returned empty response.")

            import json
            raw_data = json.loads(response.text)
            sanitized_data = sanitize_payload(raw_data)
            sanitized_data["source_url"] = source_url
            sanitized_data["sha256_hash"] = sha256_hash
            return sanitized_data

        except Exception as e:
            logger.error(f"Error extracting with Gemini 3.8 Flash: {e}")
            raise RuntimeError(f"VLM extraction failed on image page: {e}")

    def extract_from_pdf(
        self,
        pdf_bytes: bytes,
        source_url: str = "",
        sha256_hash: str = "",
    ) -> Dict[str, Any]:
        """
        Sends an entire Form 26 affidavit PDF directly to Gemini Flash for multimodal document extraction.
        Extracts candidate identity, Part A movable/immovable assets, Part B abstract summary,
        5-year ITR declarations, and criminal cases with normalized bounding boxes.
        Returns a sanitized JSON dictionary compliant with DPDPA 2023.
        """
        if not self.is_configured:
            raise RuntimeError("GEMINI_API_KEY is not configured. An official Google AI Studio key is required for verified document extraction.")

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)

            prompt = (
                "You are an expert civic-tech auditor extracting Indian Form 26 electoral affidavits. "
                "Analyze the provided Form 26 affidavit document and extract all available data into strictly valid JSON matching this schema:\n"
                "{\n"
                '  "candidate": {\n'
                '    "name": "Candidate full name",\n'
                '    "alias": "Alias or nickname if any",\n'
                '    "gender": "Male / Female / Third Gender",\n'
                '    "age": 55,\n'
                '    "father_or_spouse_name": "Father or spouse name",\n'
                '    "state": "State or UT",\n'
                '    "constituency": "Constituency name",\n'
                '    "house": "Lok Sabha | Rajya Sabha | Vidhan Sabha",\n'
                '    "party": "Party name",\n'
                '    "filing_year": 2024,\n'
                '    "education_level": "Highest qualification",\n'
                '    "education_institution": "Institution name",\n'
                '    "proof_bbox": {"page": 1, "ymin": 100, "xmin": 50, "ymax": 180, "xmax": 400}\n'
                "  },\n"
                '  "part_a_movable_items": [\n'
                '    {"category": "Cash / Bank / Vehicle / Jewelry", "description": "Details", "self_amount": 0.0, "spouse_amount": 0.0, "dependents_amount": 0.0, "proof_bbox": {"page": 4, "ymin": 200, "xmin": 50, "ymax": 250, "xmax": 900}}\n'
                "  ],\n"
                '  "part_a_immovable_items": [\n'
                '    {"category": "Agricultural Land / Commercial / Residential", "description": "Details", "self_amount": 0.0, "spouse_amount": 0.0, "dependents_amount": 0.0, "proof_bbox": {"page": 6, "ymin": 200, "xmin": 50, "ymax": 250, "xmax": 900}}\n'
                "  ],\n"
                '  "five_year_itr": [\n'
                '    {"financial_year": "2023-24", "declared_income": 0.0, "has_filed_itr": true, "proof_bbox": {"page": 2, "ymin": 150, "xmin": 50, "ymax": 200, "xmax": 900}}\n'
                "  ],\n"
                '  "criminal_cases": [\n'
                '    {"case_type": "pending / convicted", "fir_or_case_number": "FIR or Case No", "police_station": "Station", "court_name": "Court", "statutory_charges": ["IPC 143"], "charges_framed": false, "charges_framed_date": null, "proof_bbox": {"page": 3, "ymin": 200, "xmin": 50, "ymax": 300, "xmax": 900}}\n'
                "  ],\n"
                '  "part_b_summary": {\n'
                '    "movable_assets_total": 0.0,\n'
                '    "immovable_assets_total": 0.0,\n'
                '    "liabilities_total": 0.0,\n'
                '    "movable_proof_bbox": {"page": 8, "ymin": 400, "xmin": 300, "ymax": 450, "xmax": 700},\n'
                '    "immovable_proof_bbox": {"page": 8, "ymin": 460, "xmin": 300, "ymax": 510, "xmax": 700}\n'
                "  }\n"
                "}\n"
                "IMPORTANT: All amounts must be numbers in INR (Indian Rupees). For each number or row, provide normalized bounding box coordinates [ymin, xmin, ymax, xmax] on a 0-1000 scale, with the 1-indexed page number. Return ONLY valid JSON."
            )

            models_to_try = []
            for m in [self.model_name, "gemini-3.8-flash", "gemini-3.6-flash"]:
                if m and m not in models_to_try:
                    models_to_try.append(m)

            response = None
            last_err = None
            import time

            for model_id in models_to_try:
                for attempt in range(3):
                    try:
                        response = client.models.generate_content(
                            model=model_id,
                            contents=[
                                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                                prompt,
                            ],
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                temperature=0.0,
                            ),
                        )
                        if response and response.text:
                            logger.info(f"Successfully generated extraction from PDF using model: {model_id}")
                            break
                    except Exception as err:
                        last_err = err
                        err_str = str(err)
                        if ("503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str) and attempt < 2:
                            wait_time = (attempt + 1) * 2.5
                            logger.warning(f"Model {model_id} hit 503 demand spike on PDF. Retrying in {wait_time:.1f}s (attempt {attempt + 1}/3)...")
                            time.sleep(wait_time)
                        else:
                            logger.warning(f"Model {model_id} failed on PDF: {err}. Trying next fallback...")
                            break
                if response and response.text:
                    break

            if not response or not response.text:
                raise last_err or RuntimeError("Gemini model extraction on PDF returned empty response.")

            import json
            raw_data = json.loads(response.text)
            sanitized_data = sanitize_payload(raw_data)
            sanitized_data["source_url"] = source_url
            sanitized_data["sha256_hash"] = sha256_hash
            return sanitized_data

        except Exception as e:
            logger.error(f"Error extracting PDF with Gemini Flash: {e}")
            raise RuntimeError(f"VLM extraction failed on PDF: {e}")


vlm_client = GeminiVLMClient()
