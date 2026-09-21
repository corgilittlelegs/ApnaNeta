import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import asyncio

from src.storage.supabase_client import SupabaseClient
from src.ingestion.eci_affidavits import ECIAffidavitScraper


class TestIngestionContracts(unittest.IsolatedAsyncioTestCase):
    """
    Contract tests ensuring client interfaces, deduplication, and pagination
    function reliably without raising TypeErrors.
    """

    async def test_supabase_client_select_kwargs_contract(self):
        client = SupabaseClient(url="https://test.supabase.co", key="test-key")
        
        # Mock the underlying HTTP response
        mock_resp = MagicMock()
        mock_resp.is_error = False
        mock_resp.text = '[{"id": "123", "r2_storage_key": "test_key"}]'
        mock_resp.json.return_value = [{"id": "123", "r2_storage_key": "test_key"}]
        mock_resp.raise_for_status = MagicMock()

        mock_http = AsyncMock()
        mock_http.get.return_value = mock_resp
        mock_http.is_closed = False

        with patch.object(client, "get_client", return_value=mock_http):
            # Test calling with keyword arguments as used in eci_affidavits
            result = await client.select(
                "affidavits",
                columns="id, r2_storage_key",
                eq={"sha256_hash": "abc123hash"},
                limit=1,
            )
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]["id"], "123")

            # Verify the translated query parameters sent to PostgREST
            mock_http.get.assert_called_once()
            call_kwargs = mock_http.get.call_args[1]
            params = call_kwargs["params"]
            self.assertEqual(params["select"], "id, r2_storage_key")
            self.assertEqual(params["sha256_hash"], "eq.abc123hash")
            self.assertEqual(params["limit"], "1")

    async def test_supabase_client_select_all_pagination(self):
        client = SupabaseClient(url="https://test.supabase.co", key="test-key")

        # Simulate 2 pages of results
        page1 = [{"id": f"id_{i}"} for i in range(100)]
        page2 = [{"id": f"id_{i}"} for i in range(100, 150)]

        call_count = 0
        async def mock_select(table, params=None, **kwargs):
            nonlocal call_count
            offset = int(params.get("offset", 0)) if params else 0
            call_count += 1
            if offset == 0:
                return page1
            elif offset == 100:
                return page2
            return []

        with patch.object(client, "select", side_effect=mock_select):
            all_records = await client.select_all("candidates", batch_size=100)
            self.assertEqual(len(all_records), 150)
            self.assertEqual(call_count, 2)

    async def test_eci_deduplication_contract(self):
        ingestion = ECIAffidavitScraper()
        
        # Mock fetch_pdf to return valid dummy PDF bytes
        dummy_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        
        with patch.object(ingestion, "fetch_pdf", return_value=dummy_pdf):
            with patch("src.ingestion.eci_affidavits.supabase.select", new_callable=AsyncMock) as mock_select:
                mock_select.return_value = [{"id": "aff_1", "r2_storage_key": "r2_key_1"}]

                # Should execute cleanly without TypeError
                result = await ingestion.process_candidate_nomination(
                    candidate_name="Test Candidate",
                    state="Test State",
                    constituency="Test Constituency",
                    filing_year=2024,
                    house="Lok Sabha",
                    party="Independent",
                    pdf_url="https://affidavit.eci.gov.in/test.pdf",
                )

                self.assertIsNotNone(result)
                self.assertTrue(result.get("deduplicated"))
                self.assertEqual(result.get("r2_storage_key"), "r2_key_1")


if __name__ == "__main__":
    unittest.main()
