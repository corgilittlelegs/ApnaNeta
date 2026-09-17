import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from src.ingestion.wikidata_photos import (
    normalize_name,
    name_tokens_key,
    strip_html_tags,
    WikidataPhotoSynchronizer,
)


class TestWikidataPhotos(unittest.TestCase):

    def test_normalize_name(self):
        self.assertEqual(normalize_name("Narendra Modi"), "narendra modi")
        self.assertEqual(normalize_name("Shri Narendra Modi"), "shri narendra modi")
        self.assertEqual(normalize_name("Rahul Gandhi (MP)"), "rahul gandhi mp")

    def test_name_tokens_key(self):
        # Order-invariant matching for inverted names (Modi Narendra vs Narendra Modi)
        self.assertEqual(name_tokens_key("Narendra Modi"), "modi narendra")
        self.assertEqual(name_tokens_key("Modi Narendra"), "modi narendra")
        self.assertEqual(name_tokens_key("Gandhi Rahul"), name_tokens_key("Rahul Gandhi"))

    def test_strip_html_tags(self):
        html_input = '<a href="https://flickr.com/photos/xyz">Flickr User</a>'
        self.assertEqual(strip_html_tags(html_input), "Flickr User")
        self.assertEqual(strip_html_tags("Plain Name"), "Plain Name")
        self.assertEqual(strip_html_tags(""), "")

    @patch("src.ingestion.wikidata_photos.supabase")
    def test_fetch_existing_candidates(self, mock_supabase):
        mock_supabase.select = AsyncMock(
            side_effect=[
                [
                    {
                        "id": "cand-1",
                        "name": "Narendra Modi",
                        "state": "Uttar Pradesh",
                        "constituency": "Varanasi",
                        "party": "BJP",
                        "photo_url": None,
                        "photo_source": None,
                    }
                ],
                [],
            ]
        )

        import asyncio
        syncer = WikidataPhotoSynchronizer()
        exact, tokens = asyncio.run(syncer.fetch_existing_candidates())

        self.assertIn("narendra modi", exact)
        self.assertIn("modi narendra", tokens)
        self.assertEqual(exact["narendra modi"]["id"], "cand-1")

    @patch("src.ingestion.wikidata_photos.supabase")
    def test_match_candidate_fuzzy_indian_names(self, mock_supabase):
        mock_supabase.select = AsyncMock(
            side_effect=[
                [
                    {"id": "c-1", "name": "Narendra Damodardas Modi", "state": "UP", "constituency": "Varanasi", "party": "BJP"},
                    {"id": "c-2", "name": "Dr. Shashi Tharoor", "state": "Kerala", "constituency": "Thiruvananthapuram", "party": "INC"},
                    {"id": "c-3", "name": "Amit Anilchandra Shah", "state": "Gujarat", "constituency": "Gandhinagar", "party": "BJP"},
                    {"id": "c-4", "name": "Smt. Hema Malini", "state": "UP", "constituency": "Mathura", "party": "BJP"},
                ],
                [],
            ]
        )

        import asyncio
        syncer = WikidataPhotoSynchronizer()
        exact, tokens = asyncio.run(syncer.fetch_existing_candidates())

        # Test middle name matching (Narendra Modi -> Narendra Damodardas Modi)
        m1 = syncer.match_candidate("Narendra Modi", exact, tokens)
        self.assertIsNotNone(m1)
        self.assertEqual(m1["id"], "c-1")

        # Test honorific title stripping (Shashi Tharoor -> Dr. Shashi Tharoor)
        m2 = syncer.match_candidate("Shashi Tharoor", exact, tokens)
        self.assertIsNotNone(m2)
        self.assertEqual(m2["id"], "c-2")

        # Test middle name matching (Amit Shah -> Amit Anilchandra Shah)
        m3 = syncer.match_candidate("Amit Shah", exact, tokens)
        self.assertIsNotNone(m3)
        self.assertEqual(m3["id"], "c-3")

        # Test honorific prefix (Hema Malini -> Smt. Hema Malini)
        m4 = syncer.match_candidate("Hema Malini", exact, tokens)
        self.assertIsNotNone(m4)
        self.assertEqual(m4["id"], "c-4")

    @patch("src.ingestion.wikidata_photos.httpx")
    @patch.object(WikidataPhotoSynchronizer, "_execute_sparql")
    def test_fetch_wikidata_mp_photos(self, mock_sparql, mock_httpx):
        import asyncio
        mock_client = AsyncMock()
        mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
        mock_sparql.side_effect = [
            # Lok Sabha response
            [
                {
                    "politician": {"value": "http://www.wikidata.org/entity/Q1058"},
                    "politicianLabel": {"value": "Narendra Modi"},
                    "image": {"value": "http://commons.wikimedia.org/wiki/Special:FilePath/Modi.jpg"},
                }
            ],
            # Rajya Sabha response
            [
                {
                    "politician": {"value": "http://www.wikidata.org/entity/Q1058"},  # Duplicate entity
                    "politicianLabel": {"value": "Narendra Modi"},
                    "image": {"value": "http://commons.wikimedia.org/wiki/Special:FilePath/Modi.jpg"},
                },
                {
                    "politician": {"value": "http://www.wikidata.org/entity/Q9999"},
                    "politicianLabel": {"value": "Q9999"},  # Unresolved QID - should be filtered
                    "image": {"value": "http://commons.wikimedia.org/wiki/Special:FilePath/Unresolved.jpg"},
                },
                {
                    "politician": {"value": "http://www.wikidata.org/entity/Q2000"},
                    "politicianLabel": {"value": "Mallikarjun Kharge"},
                    "image": {"value": "http://commons.wikimedia.org/wiki/Special:FilePath/Kharge.jpg"},
                },
            ],
        ]

        syncer = WikidataPhotoSynchronizer()
        items = asyncio.run(syncer.fetch_wikidata_mp_photos())

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["name"], "Narendra Modi")
        self.assertEqual(items[1]["name"], "Mallikarjun Kharge")


if __name__ == "__main__":
    unittest.main()
