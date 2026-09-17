import re
from typing import Tuple, Set


# Common Indic phonetic substitution rules for cross-script English transliteration
INDIC_PHONETIC_REPLACEMENTS = [
    (r"CHOUDHARY|CHOWDHURY|CHAUDHARY|CHOUDHURY|CHAUDHRY", "CHDR"),
    (r"MUKHERJEE|MUKHOPADHYAY", "MKRJ"),
    (r"BANERJEE|BANDOPADHYAY", "BNRJ"),
    (r"CHATTERJEE|CHATTOPADHYAY", "CHTRJ"),
    (r"SHARMA|SARMA", "SRM"),
    (r"VERMA|VARMA", "VRM"),
    (r"YADAV|YADAVA", "YDV"),
    (r"REDDY|REDDI", "RDY"),
    (r"GOWDA|GAUDA", "GWD"),
    (r"PATEL|PATIL", "PTL"),
    (r"SINGH|SINHA|SIMHA", "SNG"),
    (r"PRASAD|PARSHAD", "PRSD"),
    (r"GUPTA", "GPT"),
    (r"KUMAR|KOOMAR", "KMR"),
    (r"GANDHI", "GNDH"),
    (r"MODI|MODY", "MD"),
]

# Character-level phonological normalization
PHONETIC_MAP = [
    (r"EE|EA|EY|Y", "I"),
    (r"OO|OU", "U"),
    (r"PH", "F"),
    (r"BH", "B"),
    (r"DH", "D"),
    (r"TH", "T"),
    (r"GH", "G"),
    (r"KH", "K"),
    (r"JH", "J"),
    (r"CH", "C"),
    (r"SH|SS", "S"),
    (r"W", "V"),
    (r"Z", "J"),
]


class IndicPhoneticMatcher:
    """
    Phonetic encoder adapted for Indic phonology and transliteration variations
    across English, Hindi, Bengali, Tamil, Telugu, and other regional scripts.
    Generates primary and alternate phonetic keys to match variant spellings.
    """

    def clean(self, text: str) -> str:
        """Removes punctuation, non-alphabetic chars, and extra whitespace."""
        clean_text = re.sub(r"[^A-Z\s]", "", text.upper().strip())
        return " ".join(clean_text.split())

    def encode(self, word: str) -> Tuple[str, str]:
        """
        Encodes a single Indic name token into a (primary_key, secondary_key) tuple.
        """
        token = self.clean(word)
        if not token:
            return "", ""

        # Check macro family name replacements
        for pattern, replacement in INDIC_PHONETIC_REPLACEMENTS:
            if re.match(pattern, token):
                return replacement, replacement

        # Phonological normalization
        norm = token
        for pattern, replacement in PHONETIC_MAP:
            norm = re.sub(pattern, replacement, norm)

        # Eliminate duplicate adjacent letters
        collapsed = []
        for char in norm:
            if not collapsed or collapsed[-1] != char:
                collapsed.append(char)
        primary = "".join(collapsed)

        # Drop non-initial vowels for consonant skeleton (similar to Metaphone)
        if len(primary) > 1:
            first_char = primary[0]
            consonants = re.sub(r"[AEIOU]", "", primary[1:])
            skeleton = first_char + consonants
        else:
            skeleton = primary

        return primary[:6], skeleton[:6]

    def encode_name(self, full_name: str) -> Set[str]:
        """
        Returns a set of phonetic keys across all tokens in a full name.
        """
        tokens = self.clean(full_name).split()
        keys = set()
        for t in tokens:
            p, s = self.encode(t)
            if p:
                keys.add(p)
            if s:
                keys.add(s)
        return keys

    def phonetic_similarity(self, name_a: str, name_b: str) -> float:
        """
        Computes Jaccard similarity across phonetic token keys (0.0 to 1.0).
        """
        keys_a = self.encode_name(name_a)
        keys_b = self.encode_name(name_b)

        if not keys_a or not keys_b:
            return 0.0

        intersection = keys_a.intersection(keys_b)
        union = keys_a.union(keys_b)
        return round(len(intersection) / len(union), 3)


indic_phonetics = IndicPhoneticMatcher()
