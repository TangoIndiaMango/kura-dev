"""E4.14 identity mismatch — RiskEvent + SupportCase; block session."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account
from core.exceptions import DomainError
from core.services.events import emit_event
from risk.services import RiskService
from support.models import SupportCase
from support.services.cases import SupportCaseService


def record_identity_mismatch(
    *,
    account_id,
    subject: str,
    reason: str,
    actor=None,
    hub_id=None,
    reservation_code: str = "",
) -> dict:
    note = (reason or "").strip()
    subject_line = (subject or "").strip() or "Identity mismatch at hub bay"
    if not note:
        raise DomainError(
            "VALIDATION_ERROR",
            "Mismatch reason is required.",
            details={"reason": ["required"]},
        )
    account = Account.objects.filter(pk=account_id).first()
    if account is None:
        raise DomainError("NOT_FOUND", "Account not found.", http=404)

    with transaction.atomic():
        risk = RiskService.emit(
            rule_code="MANUAL_FLAG",
            subject_type="account",
            subject_id=str(account.id),
            account=account,
            severity="HIGH",
            context={
                "kind": "IDENTITY_MISMATCH",
                "reason": note[:400],
                "hub_id": str(hub_id) if hub_id else None,
                "reservation_code": reservation_code or None,
            },
            action_taken="BLOCK",
        )
        case = SupportCaseService.open_case(
            account=account,
            subject=subject_line[:200],
            kind=SupportCase.Kind.IDENTITY,
            priority=SupportCase.Priority.HIGH,
            body=note[:4000],
            opened_by=actor,
        )
        emit_event(
            action="identity.mismatch",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=account.display_name or str(account.id),
            actor=actor,
            metadata={
                "risk_event_id": str(risk.id),
                "case_id": str(case.id),
                "case_code": case.code,
                "hub_id": str(hub_id) if hub_id else None,
                "reservation_code": reservation_code or None,
                "reason": note[:400],
            },
        )
        return {
            "risk_event_id": str(risk.id),
            "case_id": str(case.id),
            "case_code": case.code,
        }
