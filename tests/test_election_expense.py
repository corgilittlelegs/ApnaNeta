import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from types import SimpleNamespace

from src.verification.election_expense import evaluate_expense_compliance, filing_due_date
from src.ingestion.election_expense_reports import ElectionExpenseReportDiscovery, EXPENDITURE_INDEXES
from src.ingestion.election_expense_extractor import parse_expense_report_text
from src.ingestion.official_documents import get_allowed_source_document


class TestElectionExpenseCompliance(unittest.IsolatedAsyncioTestCase):
    async def test_document_redirect_cannot_leave_eci_allowlist(self):
        client = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(
            status_code=302, headers={"location": "http://169.254.169.254/latest/meta-data/"}
        )))
        with self.assertRaises(ValueError):
            await get_allowed_source_document(client, "https://www.eci.gov.in/report.pdf", {"eci.gov.in"})
        client.get.assert_awaited_once_with("https://www.eci.gov.in/report.pdf", follow_redirects=False)

    async def test_document_redirect_within_eci_is_allowed(self):
        client = SimpleNamespace(get=AsyncMock(side_effect=[
            SimpleNamespace(status_code=302, headers={"location": "/files/report.pdf"}),
            SimpleNamespace(status_code=200, headers={}, content=b"%PDF-source"),
        ]))
        response = await get_allowed_source_document(client, "https://www.eci.gov.in/report", {"eci.gov.in"})
        self.assertEqual(response.content, b"%PDF-source")
        self.assertEqual(client.get.await_count, 2)

    async def test_mospi_index_redirect_remains_on_its_allowlist(self):
        client = SimpleNamespace(get=AsyncMock(side_effect=[
            SimpleNamespace(status_code=302, headers={"location": "/reports"}),
            SimpleNamespace(status_code=200, headers={}, text="<html></html>"),
        ]))
        response = await get_allowed_source_document(client, "https://www.mospi.gov.in/", {"mospi.gov.in"})
        self.assertEqual(response.text, "<html></html>")
        self.assertEqual(client.get.await_count, 2)

    def test_due_date_excludes_result_declaration_date(self):
        self.assertEqual(filing_due_date(date(2024, 6, 4)), date(2024, 7, 4))

    def test_on_time_within_limit(self):
        result = evaluate_expense_compliance(
            result_declared_on=date(2024, 6, 4),
            filed_on=date(2024, 7, 4),
            declared_expenditure=Decimal("9200000"),
            expenditure_ceiling=Decimal("9500000"),
            as_of=date(2024, 7, 5),
        )
        self.assertEqual(result.filing_status, "on_time")
        self.assertEqual(result.ceiling_status, "within_limit")

    def test_missing_and_over_limit_are_independent(self):
        result = evaluate_expense_compliance(
            result_declared_on=date(2024, 6, 4),
            filed_on=None,
            declared_expenditure=Decimal("9600000"),
            expenditure_ceiling=Decimal("9500000"),
            as_of=date(2024, 7, 5),
        )
        self.assertEqual(result.filing_status, "missing")
        self.assertEqual(result.ceiling_status, "over_limit")

    def test_unknown_amount_never_implies_compliance(self):
        result = evaluate_expense_compliance(
            result_declared_on=date(2024, 6, 4),
            filed_on=date(2024, 6, 20),
            declared_expenditure=None,
            expenditure_ceiling=Decimal("9500000"),
        )
        self.assertEqual(result.ceiling_status, "unknown")

    async def test_discovery_records_indexes_and_expenditure_documents(self):
        discovery = ElectionExpenseReportDiscovery()
        with patch("src.ingestion.election_expense_reports.OfficialDocumentDiscovery") as factory:
            client = factory.return_value
            client.record_documents = AsyncMock(side_effect=lambda _authority, _type, urls: len(urls))
            client.discover_pdf_links = AsyncMock(return_value=["https://www.eci.gov.in/report.pdf"])
            total = await discovery.run()

        self.assertEqual(total, len(EXPENDITURE_INDEXES) * 2)
        self.assertEqual(client.discover_pdf_links.await_count, len(EXPENDITURE_INDEXES))
        client.discover_pdf_links.assert_awaited_with(EXPENDITURE_INDEXES[-1], required_text="expenditure")

    def test_report_parser_only_returns_explicitly_labelled_fields(self):
        fields = parse_expense_report_text(
            """
            Name of Candidate: Asha Devi
            Election Name: General Election to Lok Sabha 2024
            Date of Filing: 04-07-2024
            Total Election Expenditure: Rs. 9,200,000.00
            Maximum Permitted Expenditure: Rs. 9,500,000.00
            """
        )
        self.assertEqual(fields["candidate_name_declared"], "Asha Devi")
        self.assertEqual(fields["filed_on_declared"], "2024-07-04")
        self.assertEqual(fields["declared_expenditure"], "9200000.00")
        self.assertEqual(fields["expenditure_ceiling_declared"], "9500000.00")


if __name__ == "__main__":
    unittest.main()
