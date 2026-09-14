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


page_router = DocumentComplexityRouter()
