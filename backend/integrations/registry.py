from __future__ import annotations

from django.conf import settings

from core.exceptions import DomainError
from integrations.ports.psp import PspCode, PspPort
from integrations.providers.nomba.client import NombaPsp
from integrations.providers.paystack.client import PaystackPsp


def get_psp(code: str | PspCode | None = None) -> PspPort:
    resolved = (code or getattr(settings, "DEFAULT_PSP", PspCode.PAYSTACK)).upper()
    if resolved == PspCode.PAYSTACK:
        return PaystackPsp()
    if resolved == PspCode.NOMBA:
        return NombaPsp()
    raise DomainError(
        "VALIDATION_ERROR",
        f"Unknown PSP '{resolved}'.",
        details={"psp": ["invalid"]},
    )
