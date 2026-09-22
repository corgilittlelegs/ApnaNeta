"""Extraction and review-queue creation for official candidate expense reports."""

import asyncio
import hashlib
import logging
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

try:
    import httpx
except ImportError:
    httpx = None

from src.ingestion.official_documents import is_allowed_public_source
from src.storage.r2_client import r2_storage
from src.storage.supabase_client import supabase
from src.verification.election_expense import evaluate_expense_compliance

logger = logging.getLogger("ElectionExpenseExtractor")


def _parse_date(value: str) -> Optional[str]:
    value = value.strip()
    for pattern in ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(value, pattern).date().isoformat()
        except ValueError:
            continue
    return None


def _parse_amount(value: str) -> Optional[Decimal]:
    normalized = re.sub(r"[^0-9.]", "", value)
    if not normalized:
        return None
    try:
        return Decimal(normalized)
    except InvalidOperation:
        return None


def parse_expense_report_text(text: str) -> Dict[str, Any]:
    """Extracts explicitly labelled fields only; it never fills a missing value."""
    compact = re.sub(r"[ \t]+", " ", text)

    def first_match(pattern: str) -> Optional[str]:
        match = re.search(pattern, compact, flags=re.IGNORECASE)
        return match.group(1).strip() if match else None

    candidate_name = first_match(r"(?:name\s+of\s+(?:the\s+)?candidate|candidate\s+name)\s*[:\-]?\s*([A-Za-z .,'()]+)")
    election_name = first_match(r"(?:election\s+(?:name|details?)|name\s+of\s+election)\s*[:\-]?\s*([^\n]{3,120})")
    filed_raw = first_match(r"(?:date\s+of\s+(?:filing|lodging)|filed\s+on)\s*[:\-]?\s*(\d{1,2}[./ -][A-Za-z]{3,9}[./ -]\d{2,4}|\d{1,2}[./-]\d{1,2}[./-]\d{4})")
    total_raw = first_match(r"(?:total\s+(?:election\s+)?expenditure|total\s+amount\s+of\s+expenditure)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{1,2})?)")
    ceiling_raw = first_match(r"(?:maximum\s+(?:permitted\s+)?(?:expenditure|limit)|expenditure\s+ceiling)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{1,2})?)")

    return {
        "candidate_name_declared": candidate_name,
        "election_name_declared": election_name,
        "filed_on_declared": _parse_date(filed_raw) if filed_raw else None,
        "declared_expenditure": str(_parse_amount(total_raw)) if total_raw else None,
        "expenditure_ceiling_declared": str(_parse_amount(ceiling_raw)) if ceiling_raw else None,
    }


class ElectionExpenseReportExtractor:
    """Archives and parses discovered ECI PDFs into a human-reviewable queue."""

    async def _download_pdf(self, url: str) -> bytes:
        if httpx is None:
            raise ImportError("httpx is required for expense report extraction")
        if not is_allowed_public_source(url, {"eci.gov.in"}):
            raise ValueError("Rejected non-ECI expense report URL")
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
        if not response.content.startswith(b"%PDF"):
            raise ValueError("Official source did not return a PDF document")
        return response.content

    @staticmethod
    def _extract_text(pdf_bytes: bytes) -> str:
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("pymupdf is required for PDF text extraction") from exc
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        return "\n".join(page.get_text("text") for page in document)

    async def process_document(self, document: Dict[str, Any]) -> bool:
        source_url = document.get("source_url")
        if not source_url or not document.get("id"):
            return False
        try:
            pdf_bytes = await self._download_pdf(source_url)
            sha256 = hashlib.sha256(pdf_bytes).hexdigest()
            r2_key = r2_storage.upload_affidavit_pdf(pdf_bytes, sha256) if r2_storage.is_configured else None
            fields = parse_expense_report_text(self._extract_text(pdf_bytes))
            fields["source_sha256"] = sha256
            fields["parser_version"] = "expense-report-v1"
            fields["retrieved_at"] = datetime.now(timezone.utc).isoformat()
            candidate_id, election_id = await self._resolve_exact_links(fields)
            extraction_status = "needs_review"
            if candidate_id and election_id and fields.get("filed_on_declared"):
                await self._promote_exact_match(
                    candidate_id=candidate_id,
                    election_id=election_id,
                    source_document_id=document["id"],
                    source_url=source_url,
                    fields=fields,
                )
                extraction_status = "auto_linked"
            await supabase.update(
                "source_documents",
                {
                    "source_sha256": sha256,
                    "r2_storage_key": r2_key,
                    "parser_version": "expense-report-v1",
                    "review_status": "auto_linked" if extraction_status == "auto_linked" else "needs_review",
                },
                {"id": f"eq.{document['id']}"},
            )
            await supabase.upsert(
                "expense_report_extractions",
                [
                    {
                        "source_document_id": document["id"],
                        **fields,
                        "extracted_fields": fields,
                        "extraction_status": extraction_status,
                        "candidate_id": candidate_id,
                        "election_id": election_id,
                    }
                ],
                on_conflict="source_document_id",
            )
            return True
        except Exception as exc:
            logger.warning("Expense-report extraction failed for %s: %s", source_url, exc)
            await supabase.update(
                "source_documents",
                {"review_status": "extraction_failed", "notes": str(exc)[:500]},
                {"id": f"eq.{document['id']}"},
            )
            return False

    @staticmethod
    def _normalise(value: Optional[str]) -> str:
        return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()

    async def _resolve_exact_links(self, fields: Dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
        """Finds a link only when exactly one existing candidate and election match."""
        name_key = self._normalise(fields.get("candidate_name_declared"))
        election_key = self._normalise(fields.get("election_name_declared"))
        if not name_key or not election_key:
            return None, None
        candidates = [
            row for row in await supabase.select_all("candidates")
            if self._normalise(row.get("name")) == name_key
        ]
        elections = [
            row for row in await supabase.select_all("election_events")
            if self._normalise(row.get("election_name")) == election_key
        ]
        if len(candidates) != 1 or len(elections) != 1:
            return None, None
        return candidates[0].get("id"), elections[0].get("id")

    async def _promote_exact_match(
        self,
        *,
        candidate_id: str,
        election_id: str,
        source_document_id: str,
        source_url: str,
        fields: Dict[str, Any],
    ) -> None:
        elections = await supabase.select("election_events", {"id": f"eq.{election_id}", "limit": "1"})
        if not elections:
            return
        election = elections[0]
        result_date = datetime.strptime(str(election["result_declared_on"]), "%Y-%m-%d").date()
        filed_on = datetime.strptime(str(fields["filed_on_declared"]), "%Y-%m-%d").date()
        declared = Decimal(str(fields["declared_expenditure"])) if fields.get("declared_expenditure") else None
        ceiling = Decimal(str(fields["expenditure_ceiling_declared"])) if fields.get("expenditure_ceiling_declared") else None
        compliance = evaluate_expense_compliance(
            result_declared_on=result_date,
            filed_on=filed_on,
            declared_expenditure=declared,
            expenditure_ceiling=ceiling,
        )
        await supabase.upsert(
            "candidate_expense_reports",
            [
                {
                    "candidate_id": candidate_id,
                    "election_id": election_id,
                    "expenditure_ceiling": str(ceiling) if ceiling is not None else None,
                    "ceiling_source_url": source_url if ceiling is not None else None,
                    "filing_due_on": compliance.filing_due_on.isoformat(),
                    "filed_on": filed_on.isoformat(),
                    "declared_expenditure": str(declared) if declared is not None else None,
                    "filing_status": compliance.filing_status,
                    "ceiling_status": compliance.ceiling_status,
                    "source_url": source_url,
                    "source_document_id": source_document_id,
                    "scrutiny_status": "not_available",
                }
            ],
            on_conflict="candidate_id,election_id",
        )

    async def run(self) -> int:
        documents = await supabase.select_all(
            "source_documents",
            {"document_type": "eq.candidate_expenditure_report", "review_status": "eq.unreviewed"},
        )
        processed = 0
        for document in documents:
            processed += int(await self.process_document(document))
        logger.info("Extracted %d official candidate expenditure report(s) into review queue.", processed)
        return processed


election_expense_report_extractor = ElectionExpenseReportExtractor()


if __name__ == "__main__":
    asyncio.run(election_expense_report_extractor.run())
