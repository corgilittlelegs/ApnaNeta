import unittest
import importlib.util
from src.verification.policy_classifier import PolicyTopicClassifier, POLICY_DOMAINS


class TestSansadIntelligence(unittest.TestCase):
    def setUp(self):
        self.classifier = PolicyTopicClassifier()

    def test_single_question_classification(self):
        # Agriculture query
        q_agri = "Will the Minister of Agriculture be pleased to state the MSP procurement targets for wheat and paddy crops?"
        dist_agri = self.classifier.classify_question(q_agri)
        self.assertGreater(dist_agri["agriculture"], 0.4)
        self.assertEqual(dist_agri["defense_security"], 0.0)

        # Defense query
        q_def = "Details of DRDO border surveillance equipment deployed by the Army along the Line of Control"
        dist_def = self.classifier.classify_question(q_def)
        self.assertGreater(dist_def["defense_security"], 0.4)
        self.assertEqual(dist_def["agriculture"], 0.0)

    def test_portfolio_classification(self):
        questions = [
            "Funds allocated for AIIMS hospital and medical college equipment",
            "Doctor-to-patient ratio and vaccines supply in public hospitals",
            "Construction of four-lane highway and railway flyovers in Varanasi",
        ]
        portfolio = self.classifier.classify_portfolio(questions)
        self.assertEqual(portfolio["total_questions_analyzed"], 3)
        self.assertIn("health_family", portfolio["policy_topics"])
        self.assertIn("infrastructure_energy", portfolio["policy_topics"])
        self.assertGreater(portfolio["policy_topics"]["health_family"], 30.0)

    def test_local_vs_national_ratio(self):
        # 2 local questions mentioning constituency / station, 1 national question
        questions = [
            "Sanction of new railway stoppage at Amethi station for express train",
            "Repair of bypass bridge and rural roads in Amethi district",
            "Impact of global inflation on RBI foreign exchange reserves",
        ]
        ratio = self.classifier.calculate_local_vs_national_ratio(questions, constituency="Amethi", state="Uttar Pradesh")
        # 2 local hits / 1 national hit = 2.0
        self.assertEqual(ratio, 2.0)

    def test_absent_question_breakdowns_and_text_remain_unknown(self):
        from src.ingestion.sansad_api import parse_optional_int, question_texts_from_row

        # A total question count does not justify inventing a starred/unstarred
        # split or generic policy questions.
        self.assertIsNone(parse_optional_int(None))
        self.assertIsNone(parse_optional_int(""))
        self.assertEqual(parse_optional_int("0"), 0)
        self.assertEqual(question_texts_from_row({"Questions": "120"}), [])

        actual = "Will the Minister state the MSP procurement target for paddy?"
        self.assertEqual(question_texts_from_row({"Question Text": actual}), [actual])

    @unittest.skipUnless(importlib.util.find_spec("bs4"), "beautifulsoup4 is not installed")
    def test_official_question_page_parser_uses_rendered_rows(self):
        from src.ingestion.sansad_official import OfficialSansadQuestionScraper

        html = """
        <table>
          <tr><th>Q.No.</th><th>Subject</th><th>Member</th><th>Question Type</th></tr>
          <tr><td>1</td><td>Railway safety</td><td>Shri Example Member</td><td>UNSTARRED</td></tr>
        </table>
        """
        rows = OfficialSansadQuestionScraper.parse_question_rows(html)
        self.assertEqual(rows, [{"member_name": "Shri Example Member", "subject": "Railway safety", "question_type": "UNSTARRED"}])


    def test_parse_date_formats(self):
        from src.ingestion.sansad_api import parse_date
        self.assertEqual(parse_date("18 May 09"), "2009-05-18")
        self.assertEqual(parse_date("13 Oct 12"), "2012-10-13")
        self.assertEqual(parse_date("18-05-2009"), "2009-05-18")
        self.assertEqual(parse_date("2024-06-04"), "2024-06-04")
        self.assertIsNone(parse_date("In office"))
        self.assertIsNone(parse_date(""))
        self.assertIsNone(parse_date(None))

    def test_parse_attendance_and_ints(self):
        from src.ingestion.sansad_api import parse_attendance, parse_int
        self.assertEqual(parse_attendance("85.00%"), 85.0)
        self.assertEqual(parse_attendance("100%"), 100.0)
        self.assertEqual(parse_attendance(""), 0.0)
        self.assertEqual(parse_int("42"), 42)
        self.assertEqual(parse_int("37.0"), 37)
        self.assertEqual(parse_int(""), 0)


if __name__ == "__main__":
    unittest.main()
