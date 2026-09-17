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


if __name__ == "__main__":
    unittest.main()
