"""Phone normalisation to E.164 (Nigeria default)."""
from __future__ import annotations

import phonenumbers
from phonenumbers import NumberParseException

from core.exceptions import DomainError


def normalize_ng_phone(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        raise DomainError("VALIDATION_ERROR", "Phone number is required.", details={"phone": ["required"]})
    try:
        parsed = phonenumbers.parse(text, "NG")
    except NumberParseException as exc:
        raise DomainError(
            "VALIDATION_ERROR",
            "Enter a valid Nigerian phone number.",
            details={"phone": [str(exc)]},
        ) from exc
    if not phonenumbers.is_valid_number(parsed):
        raise DomainError(
            "VALIDATION_ERROR",
            "Enter a valid Nigerian phone number.",
            details={"phone": ["invalid"]},
        )
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
