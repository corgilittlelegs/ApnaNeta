import re
from typing import Dict, Any, List, Optional, Tuple


HONORIFICS = {"SHRI", "SMT", "DR", "ADV", "PROF", "MR", "MRS", "PANDIT", "CHOUDHARY"}


def clean_indian_name(name: str) -> str:
    """Removes honorifics, punctuation, and extra whitespace."""
    clean = re.sub(r"[^\w\s]", "", name.upper()).strip()
    tokens = clean.split()
    filtered = [t for t in tokens if t not in HONORIFICS]
    return " ".join(filtered) if filtered else clean


def simple_levenshtein_similarity(s1: str, s2: str) -> float:
    """Computes basic string similarity ratio between 0.0 and 1.0."""
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    len1, len2 = len(s1), len(s2)
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]

    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost,
            )

    distance = matrix[len1][len2]
    max_len = max(len1, len2)
    return round(1.0 - (distance / max_len), 3)


class IndicEntityResolver:
    """
    Resolves candidate identities across successive election cycles.
    Combines name token similarity, Indic transliteration slack,
    and bounded age drift models: |ΔAge - Δt| <= 2 years.
    """

    def is_same_candidate(
        self,
        candidate_a: Dict[str, Any],
        candidate_b: Dict[str, Any],
        threshold: float = 0.85,
    ) -> Tuple[bool, float, str]:
        """
        Determines if candidate_a and candidate_b are the same real-world politician.
        candidate dicts should contain:
          - 'name': str
          - 'state': str
          - 'filing_year': int
          - 'age': Optional[int]
          - 'father_or_spouse_name': Optional[str]
        """
        # 1. State must match
        if candidate_a.get("state", "").upper() != candidate_b.get("state", "").upper():
            return False, 0.0, "State mismatch"

        # 2. Normalized Name Similarity
        name_a = clean_indian_name(candidate_a.get("name", ""))
        name_b = clean_indian_name(candidate_b.get("name", ""))
        name_sim = simple_levenshtein_similarity(name_a, name_b)

        if name_sim < threshold:
            return False, name_sim, f"Name similarity ({name_sim}) below threshold ({threshold})"

        # 3. Age Drift Validation
        age_a = candidate_a.get("age")
        age_b = candidate_b.get("age")
        year_a = candidate_a.get("filing_year", 0)
        year_b = candidate_b.get("filing_year", 0)

        if age_a and age_b and year_a and year_b and year_a != year_b:
            elapsed_years = abs(year_b - year_a)
            age_difference = abs(age_b - age_a)
            drift = abs(age_difference - elapsed_years)

            # Allow max 2 years slack for inexact age reporting on affidavits
            if drift > 2:
                return (
                    False,
                    name_sim,
                    f"Age drift mismatch: elapsed={elapsed_years} yrs, declared diff={age_difference} yrs (drift={drift})",
                )

        return True, name_sim, "Entity resolution match confirmed"


entity_resolver = IndicEntityResolver()
