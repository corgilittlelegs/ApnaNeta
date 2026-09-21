import sys
import unittest
from unittest.mock import AsyncMock, patch, MagicMock

if "httpx" not in sys.modules:
    mock_httpx = MagicMock()
    sys.modules["httpx"] = mock_httpx

import io


class TestCandidateDeduplication(unittest.IsolatedAsyncioTestCase):

    @patch("src.ingestion.seed_loaders.supabase")
    async def test_seed_loaders_deduplication(self, mock_supabase):
        from src.ingestion.seed_loaders import ingest_open_sansad

        # Mock existing candidates in Supabase
        mock_supabase.select = AsyncMock(return_value=[
            {"name": "Ashok Kumar Mittal"}
        ])
        mock_supabase.insert = AsyncMock(return_value=[])

        # Mock CSV content with 3 rows:
        # Row 1: Ashok Kumar Mittal (already in Supabase -> should be skipped)
        # Row 2: Amrinder Singh Raja Warring (new -> should be ingested)
        # Row 3: Amrinder Singh Raja Warring (duplicate in stream -> should be skipped)
        fake_csv = (
            "schema,name,aliases,gender\n"
            "Person,Ashok Kumar Mittal,Dr. Ashok Kumar Mittal,male\n"
            "Person,Amrinder Singh Raja Warring,Raja Warring,male\n"
            "Person,Amrinder Singh Raja Warring,Raja Warring,male\n"
        )

        mock_response = MagicMock()
        mock_response.text = fake_csv
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            loaded = await ingest_open_sansad(limit=10)

        # Only 1 candidate should be loaded (Amrinder Singh Raja Warring once)
        self.assertEqual(loaded, 1)
        mock_supabase.insert.assert_called_once()
        inserted_batch = mock_supabase.insert.call_args[0][1]
        self.assertEqual(len(inserted_batch), 1)
        self.assertEqual(inserted_batch[0]["name"], "Amrinder Singh Raja Warring")

    @patch("src.ingestion.sansad_api.supabase")
    async def test_sansad_api_batch_deduplication(self, mock_supabase):
        from src.ingestion.sansad_api import SansadScraper

        scraper = SansadScraper()
        mock_supabase.select = AsyncMock(return_value=[
            {"id": "uuid-1", "name": "Amrinder Singh Raja Warring", "state": "Punjab", "constituency": "Ludhiana", "party": "INC", "house": "Lok Sabha"}
        ])
        mock_supabase.upsert = AsyncMock(return_value=[])
        mock_supabase.update = AsyncMock(return_value=[])

        # 2 rows for same MP (e.g. 17th and 18th Lok Sabha)
        fake_prs_csv = (
            "Name;Constituency;State;Party;Attendance;Debates;Questions;Starred Questions;Unstarred Questions;Private Member Bills;Start of Term;End of Term\n"
            "Amrinder Singh Raja Warring;Ludhiana;Punjab;INC;60%;2;31;3;28;0;2024-06-04;In office\n"
            "Amrinder Singh Raja Warring;Ludhiana;Punjab;INC;60%;2;31;3;28;0;2024-06-04;In office\n"
        )

        mock_response = MagicMock()
        mock_response.text = fake_prs_csv
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            synced = await scraper.sync_from_prs_activity("http://fake-url", house_label="Lok Sabha")

        # Duplicate MP rows in the CSV are collapsed to 1 record in sansad_batch
        self.assertEqual(synced, 1)
        mock_supabase.upsert.assert_called_once()


if __name__ == "__main__":
    unittest.main()
