"""Provider-agnostic PSP contracts — Finance only sees these shapes."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol


class PspCode(StrEnum):
    PAYSTACK = "PAYSTACK"
    NOMBA = "NOMBA"


class PspEventKind(StrEnum):
    FUNDING_SUCCESS = "FUNDING_SUCCESS"
    FUNDING_FAILED = "FUNDING_FAILED"
    FUNDING_REVERSED = "FUNDING_REVERSED"
    VA_ASSIGNED = "VA_ASSIGNED"
    VA_FAILED = "VA_FAILED"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True, slots=True)
class NormalizedPspEvent:
    provider: PspCode
    event_id: str
    kind: PspEventKind
    psp_reference: str
    amount_kobo: int | None = None
    currency: str = "NGN"
    account_hint: str | None = None
    nuban: str | None = None
    bank_name: str | None = None
    account_name: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class VerifyResult:
    ok: bool
    psp_reference: str
    amount_kobo: int | None = None
    currency: str = "NGN"
    status: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class VaProvisionResult:
    pending: bool
    psp_reference: str = ""
    nuban: str | None = None
    bank_name: str | None = None
    account_name: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


class PspPort(Protocol):
    """Adapter interface each PSP client implements (hexagonal 'port')."""

    code: PspCode

    def verify_webhook(self, *, headers: dict[str, str], raw_body: bytes) -> bool: ...

    def normalize_webhook(self, *, raw_body: bytes) -> NormalizedPspEvent: ...

    def verify_transaction(self, *, psp_reference: str) -> VerifyResult: ...

    def provision_virtual_account(
        self,
        *,
        account_id: str,
        display_name: str,
        email: str | None,
        phone: str | None,
        bvn_or_nin: str | None = None,
    ) -> VaProvisionResult: ...
