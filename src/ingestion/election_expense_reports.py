"""Official ECI candidate-election-expense document discovery worker."""

import asyncio
import logging

from src.ingestion.official_documents import OfficialDocumentDiscovery

logger = logging.getLogger("ElectionExpenseReports")

# These are public ECI entry points. The worker follows only ECI-hosted HTTPS
# links and records documents for later candidate/report extraction.
EXPENDITURE_INDEXES = (
    "https://www.eci.gov.in/expenditure-monitoring",
    "https://www.eci.gov.in/candidate-politicalparty",
    "https://www.eci.gov.in/general-elections",
)


class ElectionExpenseReportDiscovery:
    """Discovers source-linked candidate-expenditure documents without guessing URLs."""

    async def run(self) -> int:
        discovery = OfficialDocumentDiscovery({"eci.gov.in"})
        total = 0
        for index_url in EXPENDITURE_INDEXES:
            # Preserve the index itself: it establishes where ECI publishes the
            # material even when a page renders document links client-side.
            total += await discovery.record_documents(
                "Election Commission of India", "candidate_expenditure_index", [index_url]
            )
            try:
                urls = await discovery.discover_pdf_links(index_url, required_text="expenditure")
            except Exception as exc:
                logger.warning("Could not discover expenditure documents from %s: %s", index_url, exc)
                continue
            total += await discovery.record_documents(
                "Election Commission of India", "candidate_expenditure_report", urls
            )
        logger.info("Registered %d official election-expenditure source document(s).", total)
        return total


election_expense_report_discovery = ElectionExpenseReportDiscovery()


if __name__ == "__main__":
    asyncio.run(election_expense_report_discovery.run())
