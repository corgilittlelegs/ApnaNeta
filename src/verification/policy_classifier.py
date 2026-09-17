import re
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("PolicyClassifier")

# Statutory Legislative Policy Taxonomies for the Indian Parliament
POLICY_DOMAINS = {
    "agriculture": [
        "agriculture", "farmer", "farmers", "crop", "crops", "msp", "monsoon",
        "irrigation", "kisan", "fertilizer", "fertilizers", "soil", "horticulture",
        "paddy", "wheat", "mandi", "mandis", "apmc", "drought", "seeds", "pradhan mantri fasal bima"
    ],
    "defense_security": [
        "defense", "defence", "military", "army", "navy", "air force", "border",
        "security", "terrorist", "terrorism", "police", "crpf", "bsf", "cisf",
        "drdo", "weapon", "weapons", "surveillance", "kashmir", "line of control",
        "loc", "lac", "coastal security", "cybercrime"
    ],
    "finance_commerce": [
        "finance", "tax", "taxes", "taxation", "gst", "economy", "economic",
        "bank", "banking", "banks", "rbi", "budget", "inflation", "revenue",
        "fiscal", "fdi", "customs", "rupee", "corporate", "disinvestment",
        "debt", "trade", "export", "import", "msme", "interest rate"
    ],
    "infrastructure_energy": [
        "railway", "railways", "train", "trains", "highway", "highways", "road",
        "roads", "aviation", "airport", "airports", "power", "electricity",
        "solar", "coal", "grid", "bridge", "bridges", "port", "ports", "metro",
        "transport", "expressway", "water supply", "dam", "petroleum", "oil", "gas"
    ],
    "health_family": [
        "health", "hospital", "hospitals", "doctor", "doctors", "medical",
        "disease", "diseases", "aiims", "ayushman", "pharmaceutical", "drug",
        "drugs", "vaccine", "vaccines", "vaccination", "malnutrition", "epidemic",
        "patient", "patients", "healthcare", "public health", "mental health"
    ],
    "education_skill": [
        "education", "school", "schools", "college", "colleges", "university",
        "universities", "ugc", "ncert", "cbse", "iit", "iims", "iim", "scholarship",
        "scholarships", "teacher", "teachers", "student", "students", "skill",
        "vocational", "literacy", "nep", "curriculum"
    ],
    "law_governance": [
        "judiciary", "judge", "judges", "court", "courts", "supreme court",
        "high court", "law", "laws", "constitution", "constitutional", "bns",
        "ipc", "crpc", "election", "elections", "eci", "cbi", "ed", "corruption",
        "tribunal", "fundamental rights", "police reform", "prison", "bail"
    ],
    "environment_climate": [
        "environment", "climate", "forest", "forests", "pollution", "air quality",
        "aqi", "emission", "emissions", "wildlife", "green energy", "renewable",
        "carbon", "river", "rivers", "ganga", "yamuna", "waste management",
        "plastic", "conservation", "biodiversity"
    ],
}

LOCAL_MARKERS = [
    "district", "constituency", "taluka", "panchayat", "village", "station",
    "stoppage", "bypass", "flyover", "sanction of fund", "in my constituency",
    "state of", "bridge at", "hospital at", "expressway connecting", "local"
]


class PolicyTopicClassifier:
    """
    NLP and rule-governed policy classification engine for Question Hour,
    debates, and private member bills in Lok Sabha & Rajya Sabha.
    Computes distribution over statutory policy sectors and Grassroots/Local Focus ratios.
    """

    def clean_text(self, text: str) -> str:
        """Tokenizes and cleans parliamentary question text."""
        return " ".join(re.findall(r"\b[A-Za-z0-9_-]+\b", text.lower()))

    def classify_question(self, question_text: str) -> Dict[str, float]:
        """
        Classifies an individual question into domain probabilities.
        """
        cleaned = self.clean_text(question_text)
        if not cleaned:
            return {domain: 0.0 for domain in POLICY_DOMAINS}

        domain_scores = {}
        total_score = 0.0

        for domain, keywords in POLICY_DOMAINS.items():
            score = 0.0
            for kw in keywords:
                # Whole-phrase or word-boundary match
                pattern = r"\b" + re.escape(kw) + r"\b"
                matches = len(re.findall(pattern, cleaned))
                score += matches
            domain_scores[domain] = score
            total_score += score

        if total_score == 0:
            # Equal uniform distribution if no specific domain matched
            return {domain: round(1.0 / len(POLICY_DOMAINS), 4) for domain in POLICY_DOMAINS}

        return {
            domain: round(score / total_score, 4)
            for domain, score in domain_scores.items()
        }

    def classify_portfolio(self, questions: List[str]) -> Dict[str, Any]:
        """
        Aggregates multiple questions to produce an MP's complete legislative policy portfolio.
        """
        if not questions:
            return {
                "policy_topics": {d: 0.0 for d in POLICY_DOMAINS},
                "primary_topic": None,
                "secondary_topic": None,
                "total_questions_analyzed": 0,
            }

        cumulative_scores = {d: 0.0 for d in POLICY_DOMAINS}
        valid_count = 0

        for q in questions:
            if not q or not q.strip():
                continue
            valid_count += 1
            dist = self.classify_question(q)
            for d, val in dist.items():
                cumulative_scores[d] += val

        if valid_count == 0:
            return {
                "policy_topics": {d: 0.0 for d in POLICY_DOMAINS},
                "primary_topic": None,
                "secondary_topic": None,
                "total_questions_analyzed": 0,
            }

        normalized = {
            d: round((score / valid_count) * 100.0, 2)
            for d, score in cumulative_scores.items()
        }

        # Identify primary and secondary focus
        sorted_domains = sorted(normalized.items(), key=lambda item: item[1], reverse=True)
        primary = sorted_domains[0][0] if sorted_domains and sorted_domains[0][1] > 0 else None
        secondary = sorted_domains[1][0] if len(sorted_domains) > 1 and sorted_domains[1][1] > 0 else None

        return {
            "policy_topics": normalized,
            "primary_topic": primary,
            "secondary_topic": secondary,
            "total_questions_analyzed": valid_count,
        }

    def calculate_local_vs_national_ratio(
        self,
        questions: List[str],
        constituency: Optional[str] = None,
        state: Optional[str] = None,
    ) -> float:
        """
        Computes the ratio of Local / Constituency Grassroots questions to National Macro policy questions.
        Ratio > 1.0 indicates predominantly local delivery focus.
        Ratio < 1.0 indicates national legislative/foreign/macro focus.
        """
        if not questions:
            return 1.0

        local_hits = 0
        national_hits = 0

        constituency_norm = constituency.lower().strip() if constituency else ""
        state_norm = state.lower().strip() if state else ""

        for q in questions:
            q_clean = self.clean_text(q)
            is_local = False

            # Check if mentions candidate's constituency or state
            if constituency_norm and constituency_norm not in ("parliament of india", "india", "constituency"):
                if constituency_norm in q_clean:
                    is_local = True

            if not is_local and state_norm and state_norm not in ("india", "national"):
                if state_norm in q_clean:
                    is_local = True

            if not is_local:
                for marker in LOCAL_MARKERS:
                    if marker in q_clean:
                        is_local = True
                        break

            if is_local:
                local_hits += 1
            else:
                national_hits += 1

        if national_hits == 0:
            return float(local_hits)

        return round(local_hits / national_hits, 2)


policy_classifier = PolicyTopicClassifier()
