from __future__ import annotations
import unittest
from src.ingestion.wikidata_photos import generate_search_queries, normalize_name, name_tokens_key


class TestNameNormalization(unittest.TestCase):
    """Tests comprehensive Indian political name normalization and search query generation."""

    def test_parenthetical_titles(self):
        queries = generate_search_queries("(Dr.) Ram Shankar Katheria")
        self.assertIn("Ram Shankar Katheria", queries)

    def test_standard_prefix_honorifics(self):
        queries = generate_search_queries("Dr. Mahesh Sharma")
        self.assertIn("Mahesh Sharma", queries)

        queries_prof = generate_search_queries("Prof. (Dr.) Ram Shankar Katheria")
        self.assertIn("Ram Shankar Katheria", queries_prof)

        queries_adv = generate_search_queries("Adv. Ajay Kumar")
        self.assertIn("Ajay Kumar", queries_adv)

    def test_shri_smt_honorifics(self):
        queries_shri = generate_search_queries("Shri Narendra Modi")
        self.assertIn("Narendra Modi", queries_shri)

        queries_smt = generate_search_queries("Smt. Sonia Gandhi")
        self.assertIn("Sonia Gandhi", queries_smt)

        queries_km = generate_search_queries("Km. Mayawati")
        self.assertIn("Mayawati", queries_km)

    def test_alias_and_nicknames(self):
        queries = generate_search_queries("Prakash (alias Bablu) Sharma")
        self.assertIn("Prakash Sharma", queries)
        self.assertIn("Bablu Sharma", queries)

    def test_initials_preservation(self):
        queries = generate_search_queries("A. M. Ariff")
        self.assertIn("A M Ariff", queries)

        queries_dotted = generate_search_queries("A.M. Ariff")
        self.assertIn("A M Ariff", queries_dotted)

    def test_comma_inversion(self):
        queries = generate_search_queries("Katheria, Ram Shankar")
        self.assertIn("Ram Shankar Katheria", queries)

    def test_retained_honorifics(self):
        queries = generate_search_queries("Yogi Adityanath")
        self.assertIn("Yogi Adityanath", queries)

    def test_military_and_police_titles(self):
        queries_capt = generate_search_queries("Capt. Amarinder Singh")
        self.assertIn("Amarinder Singh", queries_capt)

        queries_col = generate_search_queries("Col. Rajyavardhan Rathore")
        self.assertIn("Rajyavardhan Rathore", queries_col)

    def test_normalize_name(self):
        norm = normalize_name("(Dr.) Ram Shankar Katheria")
        self.assertEqual(norm, "dr ram shankar katheria")

    def test_name_tokens_key_clean(self):
        key = name_tokens_key("(Dr.) Ram Shankar Katheria")
        self.assertEqual(key, "katheria ram shankar")


if __name__ == "__main__":
    unittest.main()
