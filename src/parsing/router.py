import enum
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ProcessingTier(str, enum.Enum):
    TIER_1_DIGITAL = "digital_text"     # Native selectable text -> PyMuPDF ($0.00)
    TIER_2_SCAN = "standard_scan"      # Flatbed printed scan -> PaddleOCR ($0.00)
    TIER_3_VLM = "vlm_gemini_flash"    # Handwritten, complex tables -> Gemini 3.8 Flash


class DocumentComplexityRouter:
    """
    Intelligent page router that conserves VLM quota by categorizing pages:
    - Native digital text is processed in milliseconds for $0.
    - Clean typed scans use lightweight local OCR.
    - Only complex, tabular, or handwritten pages are routed to Gemini 3.8 Flash.
    """

    def __init__(self, min_digital_chars: int = 200):
        self.min_digital_chars = min_digital_chars

    def route_page(
        self,
        page_number: int,
        total_pages: int,
        extracted_text: str,
        is_tabular_page: bool = False,
        has_handwriting_indicator: bool = False,
    ) -> ProcessingTier:
        """
        Determines the processing tier for a single page of an affidavit.
        """
        text_length = len(extracted_text.strip())

        # Check if the page is the Part B summary or Asset Annexure (critical accounting pages)
        # Form 26 affidavits usually place Part B on the last 2-3 pages
        is_summary_page = page_number >= max(1, total_pages - 2)

        if has_handwriting_indicator or (is_tabular_page and is_summary_page):
            logger.debug(f"Page {page_number} routed to TIER 3 (Gemini 3.8 Flash) due to complexity.")
            return ProcessingTier.TIER_3_VLM

        if text_length >= self.min_digital_chars:
            logger.debug(f"Page {page_number} routed to TIER 1 (Digital Text, {text_length} chars).")
            return ProcessingTier.TIER_1_DIGITAL

        # Default fallback for scans without high complexity
        return ProcessingTier.TIER_2_SCAN

    def process_tier_page(
        self,
        tier: ProcessingTier,
        page_image_bytes: bytes,
        page_number: int = 1,
        page_width: float = 595.0,
        page_height: float = 842.0,
    ) -> Dict[str, Any]:
        """
        Dispatches page processing to the corresponding extraction engine.
        For TIER_2_SCAN, executes offline local OCR saving cloud API calls.
        """
        if tier == ProcessingTier.TIER_2_SCAN:
            from src.parsing.local_ocr import local_ocr_engine
            tokens = local_ocr_engine.extract_page_tokens(page_image_bytes, page_width, page_height)
            fields = local_ocr_engine.extract_form26_fields(tokens)
            return {
                "tier": ProcessingTier.TIER_2_SCAN.value,
                "tokens": tokens,
                "fields": fields,
            }
        elif tier == ProcessingTier.TIER_3_VLM:
            from src.parsing.vlm_client import GeminiVLMClient
            vlm = GeminiVLMClient()
            return vlm.extract_from_page_image(page_image_bytes, page_number=page_number)
        else:
            return {
                "tier": ProcessingTier.TIER_1_DIGITAL.value,
                "page_number": page_number,
            }


page_router = DocumentComplexityRouter()
