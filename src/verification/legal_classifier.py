import re
from typing import List, Dict, Any


# ADR Criteria: Serious Criminal Offenses (5+ years imprisonment, corruption, violence, rape, murder)
SERIOUS_IPC_SECTIONS = {
    "302": "Murder (IPC 302 / BNS 103)",
    "307": "Attempt to murder (IPC 307 / BNS 109)",
    "376": "Rape / Sexual assault (IPC 376 / BNS 64)",
    "386": "Extortion putting person in fear of death (IPC 386)",
    "395": "Dacoity (IPC 395 / BNS 310)",
    "420": "Cheating and fraud (IPC 420 / BNS 318)",
    "120B": "Criminal conspiracy to commit serious offense (IPC 120B / BNS 61)",
    "498A": "Cruelty by husband or relatives (IPC 498A / BNS 85)",
    "364A": "Kidnapping for ransom (IPC 364A / BNS 140)",
    "153A": "Promoting enmity between groups (IPC 153A / BNS 196 - RPA Sec 8)",
}

# Bharatiya Nyaya Sanhita (BNS) Direct Section Mappings
SERIOUS_BNS_SECTIONS = {
    "103": "Murder (BNS 103)",
    "109": "Attempt to murder (BNS 109)",
    "64": "Rape / Sexual assault (BNS 64)",
    "318": "Cheating and fraud (BNS 318)",
    "85": "Cruelty by husband or relatives (BNS 85)",
    "196": "Promoting enmity between groups (BNS 196)",
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

PROTEST_BNS_SECTIONS = {
    "189": "Unlawful assembly (BNS 189)",
    "223": "Disobedience to order duly promulgated by public servant (BNS 223)",
}


class LegalClassifier:
    """
    Standardizes and categorizes criminal charges declared in Form 26
    into ADR Serious Offenses vs. Civil Disobedience / Protest citations.
    Evaluates statutory disqualification under Section 8 of the
    Representation of the People Act, 1951.
    """

    def evaluate_rpa_section_8_disqualification(
        self,
        case_type: str,
        charges: List[str],
        charges_framed: bool,
        is_convicted: bool = False,
    ) -> Dict[str, Any]:
        """
        Evaluates disqualification criteria under Section 8 of the RPA 1951:
        - Section 8(1): Conviction for specified offenses (promoting enmity, bribery, rape, etc.)
        - Section 8(3): Conviction for any offense with imprisonment of >= 2 years
        - Form 26 Table 5: Charges framed by competent court in pending case for offense punishable by >= 2 years
        """
        classification = self.classify_charges(charges)
        is_disqualified = False
        disqualification_reason = None

        if is_convicted or case_type.lower() == "convicted":
            is_disqualified = True
            disqualification_reason = "Statutory disqualification under Section 8 of the RPA 1951 due to criminal conviction."
        elif charges_framed and classification["is_serious"]:
            disqualification_reason = "High scrutiny: Competent court has formally framed charges for serious offenses punishable by >2 years."

        return {
            "is_disqualified": is_disqualified,
            "charges_framed": charges_framed,
            "disqualification_reason": disqualification_reason,
            "classification": classification,
        }

    def classify_charges(self, charges: List[str]) -> Dict[str, Any]:
        """
        Takes a list of statutory charges (e.g. ['IPC 302', 'BNS 103', 'IPC 143'])
        and returns categorization, serious flag, and statutory justification.
        """
        serious_hits = []
        protest_hits = []

        for charge in charges:
            normalized = charge.upper().strip()

            # Check for Prevention of Corruption Act, POCSO, or UAPA
            if "CORRUPTION" in normalized or "PC ACT" in normalized:
                serious_hits.append("Prevention of Corruption Act (RPA Sec 8)")
                continue
            if "POCSO" in normalized:
                serious_hits.append("POCSO Act (Crimes against children)")
                continue
            if "UAPA" in normalized:
                serious_hits.append("Unlawful Activities Prevention Act (UAPA)")
                continue

            # Check numeric section codes
            section_matches = re.findall(r"\b(\d{2,3}[A-Z]?)\b", normalized)
            for sec in section_matches:
                if "BNS" in normalized and sec in SERIOUS_BNS_SECTIONS:
                    serious_hits.append(SERIOUS_BNS_SECTIONS[sec])
                elif "BNS" in normalized and sec in PROTEST_BNS_SECTIONS:
                    protest_hits.append(PROTEST_BNS_SECTIONS[sec])
                elif sec in SERIOUS_IPC_SECTIONS:
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

