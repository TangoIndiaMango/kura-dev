"""Shift open/close with cash expected vs variance."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.models import User
from core.exceptions import DomainError
from core.money import format_naira
from core.services.events import NotifySpec, emit_event
from mobility.models import Hub
from notifications.models import Notification
from operations.models import Shift
from operations.services.cash.deposits import CashDepositService

# Flag material variance (≥ ₦100)
VARIANCE_FLAG_KOBO = 10_000


class ShiftService:
    @staticmethod
    @transaction.atomic
    def open_shift(
        *,
        agent: User,
        hub: Hub,
        opening_cash_kobo: int = 0,
        actor: User | None = None,
    ) -> Shift:
        existing = (
            Shift.objects.select_for_update()
            .filter(agent=agent, hub=hub, status=Shift.Status.OPEN)
            .first()
        )
        if existing is not None:
            return existing
        if opening_cash_kobo < 0:
            raise DomainError(
                "VALIDATION_ERROR",
                "Opening cash cannot be negative.",
                details={"opening_cash_kobo": ["non_negative"]},
            )
        shift = Shift.objects.create(
            agent=agent,
            hub=hub,
            opening_cash_kobo=opening_cash_kobo,
            status=Shift.Status.OPEN,
        )
        emit_event(
            action="shift.opened",
            subject_type="shift",
            subject_id=str(shift.id),
            subject_label=f"{hub.code} · {agent.email or agent.phone}",
            actor=actor or agent,
            after={
                "hub_id": str(hub.id),
                "opening_cash_kobo": shift.opening_cash_kobo,
                "status": shift.status,
            },
        )
        return shift

    @staticmethod
    @transaction.atomic
    def close_shift(
        *,
        shift: Shift,
        closing_cash_kobo: int,
        actor: User,
    ) -> Shift:
        locked = (
            Shift.objects.select_for_update()
            .select_related("hub", "agent")
            .filter(pk=shift.pk)
            .first()
        )
        if locked is None:
            raise DomainError("NOT_FOUND", "Shift not found.", http=404)
        counting_auto_closed = (
            locked.status == Shift.Status.CLOSED
            and locked.auto_closed
            and locked.closing_cash_kobo is None
        )
        if locked.status != Shift.Status.OPEN and not counting_auto_closed:
            raise DomainError(
                "INVALID_TRANSITION",
                "Shift is already closed.",
                http=409,
            )
        if closing_cash_kobo < 0:
            raise DomainError(
                "VALIDATION_ERROR",
                "Closing cash cannot be negative.",
                details={"closing_cash_kobo": ["non_negative"]},
            )

        deposits = CashDepositService.sum_success_kobo(shift=locked)
        expected = int(locked.opening_cash_kobo) + deposits
        variance = int(closing_cash_kobo) - expected
        before = {
            "status": locked.status,
            "closing_cash_kobo": locked.closing_cash_kobo,
            "expected_cash_kobo": locked.expected_cash_kobo,
            "variance_kobo": locked.variance_kobo,
        }
        locked.closing_cash_kobo = closing_cash_kobo
        locked.expected_cash_kobo = expected
        locked.variance_kobo = variance
        # A late count on an auto-closed window keeps its original close time.
        locked.closed_at = locked.closed_at if counting_auto_closed else timezone.now()
        locked.status = Shift.Status.CLOSED
        locked.save(
            update_fields=[
                "closing_cash_kobo",
                "expected_cash_kobo",
                "variance_kobo",
                "closed_at",
                "status",
                "updated_at",
            ]
        )

        if abs(variance) >= VARIANCE_FLAG_KOBO:
            from risk.services.events import RiskService
            from operations.services.cash.settlement import CashSettlementService

            RiskService.emit(
                rule_code="OVERRIDE_CASH_CORR",
                subject_type="shift",
                subject_id=str(locked.id),
                account=None,
                action_taken="FLAG",
                context={
                    "expected_cash_kobo": expected,
                    "closing_cash_kobo": closing_cash_kobo,
                    "variance_kobo": variance,
                    "hub_id": str(locked.hub_id),
                },
            )
            CashSettlementService.flag_shift_drawer_variance(shift=locked)

        emit_event(
            action="shift.closed",
            subject_type="shift",
            subject_id=str(locked.id),
            subject_label=f"{locked.hub.code} · closed",
            actor=actor,
            before=before,
            after={
                "status": locked.status,
                "expected_cash_kobo": expected,
                "closing_cash_kobo": closing_cash_kobo,
                "variance_kobo": variance,
            },
            notify=(
                NotifySpec(
                    user=actor,
                    title="Cash variance on shift close",
                    body=(
                        f"{locked.hub.code}: expected {format_naira(expected)}, "
                        f"counted {format_naira(closing_cash_kobo)} "
                        f"(variance {format_naira(variance)})."
                    ),
                    source="Shifts",
                    severity=Notification.Severity.WARNING,
                    link_path=f"/payments/cash/{locked.id}",
                    template_code="shift.cash_variance",
                    dedupe_key=f"shift.cash_variance:{locked.id}",
                )
                if abs(variance) >= VARIANCE_FLAG_KOBO
                else None
            ),
        )
        return locked

    @staticmethod
    def auto_close_stale_shifts(*, now=None) -> dict:
        """Nightly: close windows still open from an earlier Lagos day.

        Cash is reconciled per day, so a window may not span midnight. We record
        expected cash (float + takings) and leave the physical count pending —
        never invent a count or a variance. The agent's next cash take opens a
        fresh window automatically.
        """
        from datetime import datetime, time

        now = now or timezone.now()
        today_start = timezone.make_aware(
            datetime.combine(timezone.localdate(now), time.min)
        )
        closed = 0
        for shift_id in Shift.objects.filter(
            status=Shift.Status.OPEN, opened_at__lt=today_start
        ).values_list("id", flat=True)[:500]:
            with transaction.atomic():
                locked = (
                    Shift.objects.select_for_update()
                    .select_related("hub", "agent")
                    .filter(pk=shift_id, status=Shift.Status.OPEN)
                    .first()
                )
                if locked is None:
                    continue
                expected = int(locked.opening_cash_kobo) + CashDepositService.sum_success_kobo(
                    shift=locked
                )
                locked.expected_cash_kobo = expected
                locked.closed_at = now
                locked.status = Shift.Status.CLOSED
                locked.auto_closed = True
                locked.save(
                    update_fields=[
                        "expected_cash_kobo",
                        "closed_at",
                        "status",
                        "auto_closed",
                        "updated_at",
                    ]
                )
                emit_event(
                    action="shift.auto_closed",
                    subject_type="shift",
                    subject_id=str(locked.id),
                    subject_label=f"{locked.hub.code} · auto-closed",
                    actor=None,
                    after={"expected_cash_kobo": expected, "status": locked.status},
                    notify=NotifySpec(
                        user=locked.agent,
                        title="Duty window closed for the day",
                        body=(
                            f"{locked.hub.code}: expected cash {format_naira(expected)}. "
                            "Count your drawer with ops to record it."
                        ),
                        source="Shifts",
                        severity=Notification.Severity.INFO,
                        link_path=f"/payments/cash/{locked.id}",
                        template_code="shift.auto_closed",
                        dedupe_key=f"shift.auto_closed:{locked.id}",
                    ),
                )
                closed += 1
        return {"auto_closed": closed}
