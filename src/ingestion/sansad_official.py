"""Official Digital Sansad question-page ingestion for Lok Sabha and Rajya Sabha."""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None

from src.ingestion.official_documents import OfficialDocumentDiscovery
from src.ingestion.sansad_api import name_tokens_key, normalize_name
from src.storage.supabase_client import supabase
from src.verification.policy_classifier import policy_classifier

logger = logging.getLogger("OfficialSansad")

QUESTION_PAGES = {
    "Lok Sabha": "https://sansad.in/ls/questions/questions-and-answers",
    "Rajya Sabha": "https://sansad.in/rs/questions/questions-and-answers",
}


class OfficialSansadQuestionScraper:
    """Imports only question rows actually rendered by official Digital Sansad pages."""

    async def fetch_question_page(self, url: str) -> str:
        if httpx is None:
            raise ImportError("httpx is required for Digital Sansad ingestion")
        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text

    @staticmethod
    def parse_question_rows(html: str) -> List[Dict[str, str]]:
        """Parses actual table rows; returns nothing when the page has no rendered data."""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        results: List[Dict[str, str]] = []
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            headers = [cell.get_text(" ", strip=True).lower() for cell in rows[0].find_all(["th", "td"])]

            def index_for(*terms: str) -> Optional[int]:
                for index, header in enumerate(headers):
                    if any(term in header for term in terms):
                        return index
                return None

            member_idx = index_for("member")
            subject_idx = index_for("subject", "title")
            type_idx = index_for("question type", "type")
            if member_idx is None or subject_idx is None or type_idx is None:
                continue
            for row in rows[1:]:
                cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
                if max(member_idx, subject_idx, type_idx) >= len(cells):
                    continue
                member, subject, question_type = cells[member_idx], cells[subject_idx], cells[type_idx]
                if member and subject and question_type:
                    results.append({"member_name": member, "subject": subject, "question_type": question_type.upper()})
        return results

    async def sync_house(self, house: str, url: str) -> int:
        html = await self.fetch_question_page(url)
        rows = self.parse_question_rows(html)
        await OfficialDocumentDiscovery({"sansad.in"}).record_documents("Digital Sansad", "question_listing", [url])
        if not rows:
            logger.warning("No rendered question rows found for %s; page may require an approved session-aware adapter.", house)
            return 0

        candidates = await supabase.select_all("candidates")
        exact = {normalize_name(candidate.get("name", "")): candidate for candidate in candidates}
        tokens = {name_tokens_key(candidate.get("name", "")): candidate for candidate in candidates}
        grouped: Dict[str, List[Dict[str, str]]] = defaultdict(list)
        candidate_by_id: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            candidate = exact.get(normalize_name(row["member_name"])) or tokens.get(name_tokens_key(row["member_name"]))
            if candidate and candidate.get("id"):
                grouped[candidate["id"]].append(row)
                candidate_by_id[candidate["id"]] = candidate

        records: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc).isoformat()
        for candidate_id, questions in grouped.items():
            subjects = [question["subject"] for question in questions]
            candidate = candidate_by_id[candidate_id]
            portfolio = policy_classifier.classify_portfolio(subjects)
            records.append(
                {
                    "candidate_id": candidate_id,
                    "house": house,
                    "questions_count": len(questions),
                    "starred_questions_count": sum("STARRED" in question["question_type"] for question in questions),
                    "unstarred_questions_count": sum("UNSTARRED" in question["question_type"] for question in questions),
                    "policy_topics": portfolio.get("policy_topics"),
                    "local_vs_national_ratio": policy_classifier.calculate_local_vs_national_ratio(
                        subjects, candidate.get("constituency", ""), candidate.get("state", "")
                    ),
                    "source_url": url,
                    "source_kind": "official_digital_sansad_question_page",
                    "source_retrieved_at": now,
                }
            )
        if records:
            await supabase.upsert("sansad_records", records, on_conflict="candidate_id,house")
        logger.info("Synced %d %s member question summaries from %d official rows.", len(records), house, len(rows))
        return len(records)

    async def run(self) -> int:
        total = 0
        for house, url in QUESTION_PAGES.items():
            total += await self.sync_house(house, url)
        return total


official_sansad_scraper = OfficialSansadQuestionScraper()


if __name__ == "__main__":
    asyncio.run(official_sansad_scraper.run())
