"""Canonical ID helpers — UUIDv7 primary keys and human-facing codes."""
from __future__ import annotations

import secrets
import string

import uuid6


def uuid7():
    """Time-ordered UUIDv7 for primary keys and idempotency keys."""
    return uuid6.uuid7()


def kura_id(prefix: str = "KU", length: int = 8) -> str:
    """Short public identifier, e.g. KU-A3F9K2M1."""
    alphabet = string.ascii_uppercase + string.digits
    body = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}-{body}"


def reservation_code() -> str:
    """PRD 4.3 — KB-XXXX (4 digits)."""
    return f"KB-{secrets.randbelow(10_000):04d}"


def receipt_code() -> str:
    """Receipt reference suitable for SMS / USSD."""
    return kura_id("RC", 10)
