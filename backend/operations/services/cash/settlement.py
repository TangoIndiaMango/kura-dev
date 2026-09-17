"""
Cash settlement lifecycle (PRD §8 / E2.*).

1. Hub cash → cash_float (agent takes cash; operator already credited / fee booked).
2. Lodge/settle → psp_clearing DR / cash_float CR when bank/PSP confirms value.
3. Worker scans closed shifts: drawer variance → Risk + Alert; unlodged float → Alert.
4. Rider amount dispute → SupportCase (flag on deposit) — separate from ops settle.

Mismatch surfaces (do not collapse into one queue):
- SHIFT_CASH_VARIANCE Alert + Risk OVERRIDE_CASH_CORR → drawer vs system
- SETTLEMENT_MISMATCH Alert → float not cleared / lodge amount ≠ expected
- PAYMENT_DISPUTE Case → rider says receipt ≠ cash handed
"""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from core.exceptions import DomainError
from core.money import format_naira
from core.services.events import NotifySpec, emit_event
from finance.models import LedgerAccount, LedgerTransaction
from finance.services.ledger import LedgerService
from notifications.models import Notification
from operations.models import Alert, CashDeposit, Shift
from operations.services.cash.deposits import CashDepositService


VARIANCE_FLAG_KOBO = 10_000
UNLODGED_HOURS = 12


def _open_alert(*, hub, kind: str, severity: str, message: str, dedupe_prefix: str) -> Alert:
    existing = (
        Alert.objects.filter(
            hub=hub,
            kind=kind,
            status__in=[Alert.Status.OPEN, Alert.Status.ACKNOWLEDGED, Alert.Status.ESCALATED],
            message__startswith=dedupe_prefix,
        )
        .order_by("-created_at")
        .first()
    )
    if existing is not None:
        return existing
    return Alert.objects.create(
        hub=hub,
        kind=kind,
        severity=severity,
        message=message[:2000],
        status=Alert.Status.OPEN,
    )


class CashSettlementService:
    @staticmethod
    @transaction.atomic
    def confirm_lodge(
        *,
        shift: Shift,
        lodge_ref: str,
        amount_kobo: int | None = None,
        actor=None,
    ) -> Shift:
        """
        Ops/PSP confirmation that agent cash was lodged (bank slip or gateway settle).
        Clears cash_float into psp_clearing. Idempotent on lodge_ref per shift.
        """
        ref = (lodge_ref or "").strip()
        if not ref:
            raise DomainError(
                "VALIDATION_ERROR",
                "lodge_ref is required.",
                details={"lodge_ref": ["required"]},
            )
        locked = (
            Shift.objects.select_for_update()
            .select_related("agent", "hub")
            .filter(pk=shift.pk)
            .first()
        )
        if locked is None:
            raise DomainError("NOT_FOUND", "Shift not found.", http=404)
        if locked.status != Shift.Status.CLOSED:
            raise DomainError(
                "INVALID_TRANSITION",
                "Lodge cash only after the shift is closed.",
                http=409,
            )
        if locked.lodge_ref and locked.lodge_ref == ref:
            return locked
        if locked.lodged_at is not None:
            raise DomainError(
                "INVALID_TRANSITION",
                "Shift cash already lodged.",
                http=409,
            )

        deposits = CashDepositService.sum_success_kobo(shift=locked)
        lodge_amt = int(amount_kobo) if amount_kobo is not None else deposits
        if lodge_amt < 0:
            raise DomainError(
                "VALIDATION_ERROR",
                "Lodge amount cannot be negative.",
                details={"amount_kobo": ["non_negative"]},
            )

        expected = deposits
        if lodge_amt != expected and abs(lodge_amt - expected) >= VARIANCE_FLAG_KOBO:
            _open_alert(
                hub=locked.hub,
                kind=Alert.Kind.SETTLEMENT_MISMATCH,
                severity=Alert.Severity.WARNING,
                dedupe_prefix=f"settle:{locked.id}:",
                message=(
                    f"settle:{locked.id}: lodge {format_naira(lodge_amt)} "
                    f"≠ shift deposits {format_naira(expected)} "
                    f"(ref {ref})."
                ),
            )

        if lodge_amt > 0:
            float_code = f"cash_float:{locked.agent_id}"
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.AGENT_CASH,
                reference=f"LODGE-{ref}"[:100],
                description=f"Cash lodge {ref} for shift {locked.id}",
                entries=[
                    {
                        "code": "psp_clearing",
                        "type": LedgerAccount.AccountType.CLEARING,
                        "debit": lodge_amt,
                        "credit": 0,
                    },
                    {
                        "code": float_code,
                        "type": LedgerAccount.AccountType.ASSET,
                        "debit": 0,
                        "credit": lodge_amt,
                    },
                ],
            )

        before = {"lodge_ref": locked.lodge_ref, "lodged_amount_kobo": locked.lodged_amount_kobo}
        locked.lodge_ref = ref
        locked.lodged_amount_kobo = lodge_amt
        locked.lodged_at = timezone.now()
        locked.save(
            update_fields=[
                "lodge_ref",
                "lodged_amount_kobo",
                "lodged_at",
                "updated_at",
            ]
        )
        emit_event(
            action="shift.cash_lodged",
            subject_type="shift",
            subject_id=str(locked.id),
            subject_label=f"{locked.hub.code} · {ref}",
            actor=actor,
            before=before,
            after={
                "lodge_ref": ref,
                "lodged_amount_kobo": lodge_amt,
                "deposit_total_kobo": expected,
            },
            notify=NotifySpec(
                user=actor,
                title="Cash lodge recorded",
                body=f"{locked.hub.code}: {format_naira(lodge_amt)} · {ref}",
                source="Shifts",
                severity=Notification.Severity.INFO,
                link_path=f"/payments?tab=cash&id={locked.id}",
                template_code="shift.cash_lodged",
                dedupe_key=f"shift.cash_lodged:{locked.id}:{ref}",
            )
            if actor is not None
            else None,
        )
        return locked

    @staticmethod
    def flag_shift_drawer_variance(*, shift: Shift) -> None:
        """Called on close when |variance| is material — Alert + existing Risk emit."""
        variance = int(shift.variance_kobo or 0)
        if abs(variance) < VARIANCE_FLAG_KOBO:
            return
        _open_alert(
            hub=shift.hub,
            kind=Alert.Kind.SHIFT_CASH_VARIANCE,
            severity=Alert.Severity.WARNING
            if abs(variance) < 50_000
            else Alert.Severity.CRITICAL,
            dedupe_prefix=f"shift-var:{shift.id}:",
            message=(
                f"shift-var:{shift.id}: {shift.hub.code} drawer variance "
                f"{format_naira(variance)} "
                f"(expected {format_naira(int(shift.expected_cash_kobo or 0))}, "
                f"counted {format_naira(int(shift.closing_cash_kobo or 0))})."
            ),
        )

    @staticmethod
    def run_settlement_sweep(*, stale_hours: int = UNLODGED_HOURS) -> dict:
        """
        Background confirm pass (enqueued by run_task_worker).
        When PSP gateway posts settles, a future matcher will call confirm_lodge.
        Until then: surface unlodged closed-shift float and unresolved drawer variance.
        """
        cutoff = timezone.now() - timedelta(hours=max(1, stale_hours))
        closed = (
            Shift.objects.filter(status=Shift.Status.CLOSED, closed_at__lte=cutoff)
            .select_related("hub", "agent")
            .order_by("-closed_at")[:200]
        )
        unlodged = 0
        variance_alerts = 0
        for shift in closed:
            deposits = CashDepositService.sum_success_kobo(shift=shift)
            if deposits > 0 and shift.lodged_at is None:
                unlodged += 1
                _open_alert(
                    hub=shift.hub,
                    kind=Alert.Kind.SETTLEMENT_MISMATCH,
                    severity=Alert.Severity.WARNING,
                    dedupe_prefix=f"unlodged:{shift.id}:",
                    message=(
                        f"unlodged:{shift.id}: {shift.hub.code} still has "
                        f"{format_naira(deposits)} agent float unlodged "
                        f"after {stale_hours}h."
                    ),
                )
            if (
                shift.variance_kobo is not None
                and abs(int(shift.variance_kobo)) >= VARIANCE_FLAG_KOBO
            ):
                CashSettlementService.flag_shift_drawer_variance(shift=shift)
                variance_alerts += 1

        float_open = (
            CashDeposit.objects.filter(
                status=CashDeposit.Status.SUCCESS,
                shift__status=Shift.Status.OPEN,
            ).aggregate(s=Sum("amount_kobo"))["s"]
            or 0
        )

        escalate_after = timezone.now() - timedelta(hours=24)
        escalated = 0
        for alert in Alert.objects.filter(
            kind__in=[
                Alert.Kind.SETTLEMENT_MISMATCH,
                Alert.Kind.SHIFT_CASH_VARIANCE,
            ],
            status=Alert.Status.OPEN,
            created_at__lte=escalate_after,
        ).order_by("created_at")[:100]:
            alert.status = Alert.Status.ESCALATED
            alert.severity = Alert.Severity.CRITICAL
            alert.save(update_fields=["status", "severity", "updated_at"])
            escalated += 1

        return {
            "closed_scanned": len(closed),
            "unlodged_flagged": unlodged,
            "variance_reswept": variance_alerts,
            "alerts_auto_escalated": escalated,
            "open_shift_float_kobo": int(float_open),
        }
