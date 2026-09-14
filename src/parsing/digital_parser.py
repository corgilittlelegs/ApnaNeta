import logging
from typing import List, Dict, Any, Optional
from src.parsing.schemas import BoundingBox

logger = logging.getLogger(__name__)


class DigitalPDFParser:
    """
    High-speed, zero-cost parser for digital/selectable PDF documents using PyMuPDF.
    Extracts text, structured blocks, and normalizes bounding boxes to the 0-1000 scale.
    """

    def extract_page_text_and_blocks(self, pdf_bytes: bytes, page_number: int) -> Dict[str, Any]:
        """
        Extracts plain text and positioned bounding blocks from a specific page.
        page_number is 1-indexed.
        """
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            if page_number < 1 or page_number > len(doc):
                return {"text": "", "blocks": [], "total_pages": len(doc)}

            page = doc[page_number - 1]
            rect = page.rect
            page_width, page_height = rect.width, rect.height
            text = page.get_text("text")

            # Extract structured text blocks with coordinates
            raw_blocks = page.get_text("blocks")
            normalized_blocks: List[Dict[str, Any]] = []

            for block in raw_blocks:
                x0, y0, x1, y1, block_text, block_no, block_type = block[:7]
                if not block_text.strip():
                    continue

                # Normalize coordinates to 0-1000 integer scale
                bbox = BoundingBox(
                    page=page_number,
                    ymin=int((y0 / page_height) * 1000),
                    xmin=int((x0 / page_width) * 1000),
                    ymax=int((y1 / page_height) * 1000),
                    xmax=int((x1 / page_width) * 1000),
                )
                normalized_blocks.append({"text": block_text.strip(), "bbox": bbox.model_dump()})

            doc.close()
            return {
                "text": text,
                "blocks": normalized_blocks,
                "total_pages": len(doc),
            }
        except ImportError:
            logger.warning("PyMuPDF (fitz) not installed; operating in fallback text mode.")
            return {"text": "", "blocks": [], "total_pages": 1}
        except Exception as e:
            logger.error(f"Error parsing digital PDF page {page_number}: {e}")
            return {"text": "", "blocks": [], "total_pages": 1}


digital_parser = DigitalPDFParser()
