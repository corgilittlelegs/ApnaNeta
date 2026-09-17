import io
import logging
from typing import List, Dict, Any, Optional, Tuple
from src.parsing.schemas import BoundingBox

logger = logging.getLogger("LocalOCREngine")


class LocalOCREngine:
    """
    Tier 2 Local OCR Engine for typed flatbed scans.
    Processes scanned pages offline to extract text tokens, tabular structures,
    and normalized bounding boxes [ymin, xmin, ymax, xmax] (0-1000 scale).
    Conserves multimodal VLM API quotas and latency.
    """

    def __init__(self, use_gpu: bool = False, lang: str = "en"):
        self.use_gpu = use_gpu
        self.lang = lang
        self._ocr_engine = None

    def _get_engine(self):
        """Initializes PaddleOCR if available."""
        if self._ocr_engine is None:
            try:
                from paddleocr import PaddleOCR
                self._ocr_engine = PaddleOCR(use_angle_cls=True, lang=self.lang, show_log=False)
                logger.info("Initialized local PaddleOCR engine.")
            except ImportError:
                logger.debug("PaddleOCR not installed in local environment.")
                self._ocr_engine = False
        return self._ocr_engine

    def normalize_coordinates(
        self,
        box: List[float],
        page_width: float,
        page_height: float,
    ) -> BoundingBox:
        """
        Normalizes pixel coordinates [ymin, xmin, ymax, xmax] to a 0-1000 scale.
        """
        if page_width <= 0 or page_height <= 0:
            return BoundingBox(page=1, ymin=0, xmin=0, ymax=0, xmax=0)

        ymin, xmin, ymax, xmax = box[0], box[1], box[2], box[3]
        norm_ymin = int(round((ymin / page_height) * 1000))
        norm_xmin = int(round((xmin / page_width) * 1000))
        norm_ymax = int(round((ymax / page_height) * 1000))
        norm_xmax = int(round((xmax / page_width) * 1000))

        return BoundingBox(
            page=1,
            ymin=max(0, min(1000, norm_ymin)),
            xmin=max(0, min(1000, norm_xmin)),
            ymax=max(0, min(1000, norm_ymax)),
            xmax=max(0, min(1000, norm_xmax)),
        )

    def extract_page_tokens(
        self,
        image_bytes: bytes,
        page_width: float = 595.0,
        page_height: float = 842.0,
    ) -> List[Dict[str, Any]]:
        """
        Extracts OCR word tokens and their normalized bounding boxes from a scanned page image.
        """
        if not image_bytes:
            return []

        engine = self._get_engine()
        results = []

        if engine:
            try:
                ocr_out = engine.ocr(image_bytes, cls=True)
                for line in ocr_out[0] if ocr_out else []:
                    pts, (text, conf) = line
                    # pts is [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
                    xs = [p[0] for p in pts]
                    ys = [p[1] for p in pts]
                    xmin, xmax = min(xs), max(xs)
                    ymin, ymax = min(ys), max(ys)

                    norm_box = self.normalize_coordinates([ymin, xmin, ymax, xmax], page_width, page_height)
                    results.append({
                        "text": text.strip(),
                        "confidence": round(float(conf), 3),
                        "bbox": norm_box.model_dump(),
                    })
                return results
            except Exception as e:
                logger.warning(f"PaddleOCR execution error: {e}")

        # Fallback: PyMuPDF pixmap block extraction if PyMuPDF is available
        try:
            import fitz
            doc = fitz.open(stream=image_bytes, filetype="pdf" if image_bytes.startswith(b"%PDF") else "png")
            if len(doc) > 0:
                page = doc[0]
                blocks = page.get_text("blocks")
                p_width = page.rect.width
                p_height = page.rect.height
                for b in blocks:
                    bx0, by0, bx1, by1, btext, _, _ = b
                    norm_box = self.normalize_coordinates([by0, bx0, by1, bx1], p_width, p_height)
                    results.append({
                        "text": btext.strip(),
                        "confidence": 0.95,
                        "bbox": norm_box.model_dump(),
                    })
        except Exception as e:
            logger.debug(f"Local text block extraction fallback returned: {e}")

        return results

    def extract_form26_fields(self, tokens: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Parses high-level Form 26 fields from OCR tokens using regex layout rules.
        """
        import re
        extracted: Dict[str, Any] = {
            "candidate_name": None,
            "pan": None,
            "movable_assets_total": None,
            "immovable_assets_total": None,
            "liabilities_total": None,
            "extracted_tokens_count": len(tokens),
        }

        full_text = " ".join(t.get("text", "") for t in tokens)

        # PAN pattern
        pan_match = re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", full_text)
        if pan_match:
            extracted["pan"] = pan_match.group(0)

        # Search for Part B totals
        # e.g., "Total of Movable Assets" followed by numbers
        mov_match = re.search(r"(?:movable assets|total movable)\D{1,30}(\d[\d,]+(?:\.\d+)?)", full_text, re.IGNORECASE)
        if mov_match:
            try:
                val = float(mov_match.group(1).replace(",", ""))
                extracted["movable_assets_total"] = val
            except ValueError:
                pass

        immov_match = re.search(r"(?:immovable assets|total immovable)\D{1,30}(\d[\d,]+(?:\.\d+)?)", full_text, re.IGNORECASE)
        if immov_match:
            try:
                val = float(immov_match.group(1).replace(",", ""))
                extracted["immovable_assets_total"] = val
            except ValueError:
                pass

        return extracted


local_ocr_engine = LocalOCREngine()
