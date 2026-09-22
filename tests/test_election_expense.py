import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from src.verification.election_expense import evaluate_expense_compliance, filing_due_date
from src.ingestion.election_expense_reports import ElectionExpenseReportDiscovery, EXPENDITURE_INDEXES


class TestElectionExpenseCompliance(unittest.IsolatedAsyncioTestCase):
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


if __name__ == "__main__":
    unittest.main()
