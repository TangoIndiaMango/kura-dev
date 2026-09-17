"""CREDIT_BUSTOUT — velocity spike after disbursement closes the credit line."""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from core.services.events import NotifySpec, emit_event
from credit.models import CreditLine, Loan
from mobility.models import Swap
from notifications.models import Notification


def check_credit_bustout(*, account, swap_id=None) -> bool:
    """
    PRD 07: swaps/day ×3 vs 30-d avg within 7 d of disbursement → CLOSE line.
    Returns True if a bust-out was actioned.
    """
    now = timezone.now()
    loan = (
        Loan.objects.filter(
            account=account,
            status__in=[Loan.Status.ACTIVE, Loan.Status.GRACE],
            starts_at__gte=now - timedelta(days=7),
        )
        .order_by("-starts_at")
        .first()
    )
    if loan is None:
        return False

    today = now.date()
    today_count = Swap.objects.filter(
        account=account,
        status=Swap.Status.COMPLETED,
        completed_at__date=today,
    ).count()
    if today_count < 3:
        return False

    window_start = loan.starts_at - timedelta(days=30)
    prior = (
        Swap.objects.filter(
            account=account,
            status=Swap.Status.COMPLETED,
            completed_at__gte=window_start,
            completed_at__lt=loan.starts_at,
        )
        .annotate(day=TruncDate("completed_at"))
        .values("day")
        .annotate(n=Count("id"))
    )
    day_counts = [int(r["n"]) for r in prior]
    avg = (sum(day_counts) / len(day_counts)) if day_counts else 0.0
    baseline = max(avg, 0.5)
    if today_count < baseline * 3:
        return False

    return close_credit_line_for_bustout(
        account=account,
        loan=loan,
        context={
            "today_swaps": today_count,
            "baseline_avg": round(baseline, 2),
            "swap_id": str(swap_id) if swap_id else None,
            "loan_id": str(loan.id),
        },
    )


def close_credit_line_for_bustout(*, account, loan: Loan, context: dict) -> bool:
    with transaction.atomic():
        line = (
            CreditLine.objects.select_for_update()
            .filter(account=account)
            .first()
        )
        if line is not None and line.status == CreditLine.Status.CLOSED:
            return False
        locked = Loan.objects.select_for_update().get(pk=loan.pk)
        if line is not None:
            line.status = CreditLine.Status.CLOSED
            line.save(update_fields=["status", "updated_at"])
        locked.status = Loan.Status.RESTRICTED
        locked.swap_credit_remaining_kobo = 0
        locked.save(
            update_fields=["status", "swap_credit_remaining_kobo", "updated_at"]
        )

        from risk.services.events import RiskService

        RiskService.emit(
            rule_code="CREDIT_BUSTOUT",
            subject_type="loan",
            subject_id=str(locked.id),
            account=account,
            context=context,
            action_taken="CLOSE_LINE",
            severity="HIGH",
        )
        emit_event(
            action="credit.line_closed_bustout",
            subject_type="loan",
            subject_id=str(locked.id),
            after=context,
            notify=NotifySpec(
                user=account.owner_user,
                title="Swap credit paused",
                body="Unusual swap activity was flagged. Your credit line is closed pending review.",
                severity=Notification.Severity.WARNING,
                dedupe_key=f"credit.bustout:{locked.id}",
            ),
        )
    return True
