"""Field encryption helpers — Django signing (no extra crypto dependency)."""
from __future__ import annotations

from django.conf import settings
from django.core import signing


def _salt() -> str:
    return "kura.identity.v1"


def encrypt_text(value: str) -> str:
    if not value:
        return ""
    return signing.dumps(value, salt=_salt(), compress=True)


def decrypt_text(token: str) -> str:
    if not token:
        return ""
    return signing.loads(token, salt=_salt())
