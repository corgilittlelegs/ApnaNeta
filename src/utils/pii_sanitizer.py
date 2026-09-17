import re
from typing import Dict, Any


# Standard Indian PII Regular Expressions
PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")
INDIAN_PHONE_REGEX = re.compile(r"\b(?:\+91[-.\s]?)?[6-9]\d{9}\b")
BANK_ACCOUNT_REGEX = re.compile(r"\b\d{9,18}\b")
AADHAAR_REGEX = re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b")


def mask_pan(pan: str) -> str:
    """Masks a 10-character Permanent Account Number: ABCDE1234F -> XXXXX1234F."""
    if len(pan) == 10:
        return f"XXXXX{pan[5:]}"
    return "[REDACTED-PAN]"


def mask_phone(phone: str) -> str:
    """Masks a 10-digit mobile number: 9876543210 -> XXXXXX3210."""
    clean = re.sub(r"\D", "", phone)
    if len(clean) >= 10:
        return f"XXXXXX{clean[-4:]}"
    return "[REDACTED-PHONE]"


def mask_aadhaar(aadhaar: str) -> str:
    """Masks a 12-digit Indian Aadhaar number: 2345 6789 0123 -> XXXXXXXX0123."""
    clean = re.sub(r"\D", "", aadhaar)
    if len(clean) == 12:
        return f"XXXXXXXX{clean[-4:]}"
    return "[REDACTED-AADHAAR]"


def mask_bank_account(account: str) -> str:
    """Masks a bank account number (9 to 18 digits): 12345678901 -> XXXXXXX8901."""
    clean = account.strip()
    if len(clean) >= 4:
        return f"{'X' * (len(clean) - 4)}{clean[-4:]}"
    return "[REDACTED-ACCT]"


def sanitize_text(text: str) -> str:
    """
    Sanitizes raw text strings according to Section 3(c)(ii) of DPDPA 2023.
    Redacts personal phone numbers, bank accounts, Aadhaar numbers, and masks PAN cards.
    """
    if not text:
        return text

    # Mask PANs
    sanitized = PAN_REGEX.sub(lambda m: mask_pan(m.group(0)), text)

    # Mask Indian phone numbers
    sanitized = INDIAN_PHONE_REGEX.sub(lambda m: mask_phone(m.group(0)), sanitized)

    # Mask Aadhaar numbers
    sanitized = AADHAAR_REGEX.sub(lambda m: mask_aadhaar(m.group(0)), sanitized)

    # Mask Bank account numbers
    sanitized = BANK_ACCOUNT_REGEX.sub(lambda m: mask_bank_account(m.group(0)), sanitized)

    return sanitized


def sanitize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively traverses and sanitizes an extraction payload dictionary.
    """
    sanitized = {}
    for key, value in payload.items():
        if isinstance(value, str):
            # Special handling for explicit PAN, Aadhaar, phone, and account fields
            key_lower = key.lower()
            if "pan" in key_lower:
                sanitized[key] = mask_pan(value)
            elif "aadhaar" in key_lower or "uid" in key_lower:
                sanitized[key] = mask_aadhaar(value)
            elif "phone" in key_lower or "mobile" in key_lower:
                sanitized[key] = mask_phone(value)
            elif "account" in key_lower and re.match(r"^\d+$", value):
                sanitized[key] = mask_bank_account(value)
            else:
                sanitized[key] = sanitize_text(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_payload(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_payload(item) if isinstance(item, dict) else (sanitize_text(item) if isinstance(item, str) else item)
                for item in value
            ]
        else:
            sanitized[key] = value
    return sanitized
