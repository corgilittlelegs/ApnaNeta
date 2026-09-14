import re
from typing import List, Dict, Any


# ADR Criteria: Serious Criminal Offenses (5+ years imprisonment, corruption, violence, rape, murder)
SERIOUS_IPC_SECTIONS = {
    "302": "Murder (IPC 302 / BNS 103)",
    "307": "Attempt to murder (IPC 307 / BNS 109)",
    "376": "Rape / Sexual assault (IPC 376 / BNS 64)",
    "386": "Extortion putting person in fear of death (IPC 386)",
    "395": "Dacoity (IPC 395)",
    "420": "Cheating and fraud (IPC 420 / BNS 318)",
    "120B": "Criminal conspiracy to commit serious offense (IPC 120B)",
    "498A": "Cruelty by husband or relatives (IPC 498A / BNS 85)",
}

# Civil Disobedience / Political Protest Sections
PROTEST_IPC_SECTIONS = {
    "143": "Unlawful assembly (IPC 143 / BNS 189)",
    "147": "Rioting without deadly weapons (IPC 147)",
    "149": "Member of unlawful assembly (IPC 149)",
    "188": "Disobedience to public servant order / prohibitory orders (IPC 188 / BNS 223)",
    "341": "Wrongful restraint / rasta roko (IPC 341)",
    "283": "Danger or obstruction in public way (IPC 283)",
}


class LegalClassifier:
    """
    Standardizes and categorizes criminal charges declared in Form 26
    into ADR Serious Offenses vs. Civil Disobedience / Protest citations.
    Anchored in Section 8 of the Representation of the People Act, 1951.
    """

    def classify_charges(self, charges: List[str]) -> Dict[str, Any]:
        """
        Takes a list of statutory charges (e.g. ['IPC 302', 'IPC 143'])
        and returns categorization, serious flag, and statutory justification.
        """
        serious_hits = []
        protest_hits = []

        for charge in charges:
            normalized = charge.upper().strip()

            # Check for Prevention of Corruption Act or POCSO
            if "CORRUPTION" in normalized or "PC ACT" in normalized:
                serious_hits.append("Prevention of Corruption Act")
                continue
            if "POCSO" in normalized:
                serious_hits.append("POCSO Act (Crimes against children)")
                continue

            # Check numeric section codes
            section_matches = re.findall(r"\b(\d{3}[A-Z]?)\b", normalized)
            for sec in section_matches:
                if sec in SERIOUS_IPC_SECTIONS:
                    serious_hits.append(SERIOUS_IPC_SECTIONS[sec])
                elif sec in PROTEST_IPC_SECTIONS:
                    protest_hits.append(PROTEST_IPC_SECTIONS[sec])

        is_serious = len(serious_hits) > 0
        is_protest = len(protest_hits) > 0 and not is_serious

        if is_serious:
            category = "Serious Criminal Offense"
            justification = f"Contains charges punishable by 5+ years or under RPA Section 8: {', '.join(set(serious_hits))}"
        elif is_protest:
            category = "Civil Disobedience / Political Agitation"
            justification = f"Citations arising from public demonstrations/unlawful assembly: {', '.join(set(protest_hits))}"
        else:
            category = "General Statutory Citation"
            justification = "Procedural or non-heinous statutory citations"

        return {
            "is_serious": is_serious,
            "category": category,
            "justification": justification,
            "serious_charges_identified": serious_hits,
            "protest_charges_identified": protest_hits,
        }


legal_classifier = LegalClassifier()
