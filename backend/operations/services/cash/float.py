"""Agent cash float outstanding + limit (ops float until bank lodge / PSP)."""
from __future__ import annotations

from django.conf import settings
from django.db.models import Sum

from core.exceptions import DomainError
from operations.models import Alert, CashDeposit, Shift


def float_limit_kobo() -> int:
    return int(getattr(settings, "CASH_FLOAT_LIMIT_KOBO", 50_000_000) or 50_000_000)


def agent_float_outstanding_kobo(*, agent) -> int:
    """Cash SUCCESS on OPEN shifts — physical float not yet closed/lodged."""
    total = (
        CashDeposit.objects.filter(
            agent=agent,
            status=CashDeposit.Status.SUCCESS,
            shift__status=Shift.Status.OPEN,
        ).aggregate(s=Sum("amount_kobo"))["s"]
        or 0
    )
    return int(total)


def assert_within_float_limit(*, agent, amount_kobo: int) -> None:
    limit = float_limit_kobo()
    outstanding = agent_float_outstanding_kobo(agent=agent)
    if outstanding + amount_kobo > limit:
        prefix = f"Agent {agent.id} cash float"
        if not Alert.objects.filter(
            kind=Alert.Kind.CASH_LIMIT,
            status=Alert.Status.OPEN,
            message__startswith=prefix,
        ).exists():
            Alert.objects.create(
                kind=Alert.Kind.CASH_LIMIT,
                severity=Alert.Severity.WARNING,
                message=(
                    f"{prefix} would exceed ₦{limit // 100:,} "
                    f"(outstanding {outstanding}, +{amount_kobo})."
                ),
            )
        raise DomainError(
            "CASH_FLOAT_LIMIT",
            "Agent cash float limit reached. Close/lodge shift cash before more deposits.",
            details={
                "outstanding_kobo": outstanding,
                "limit_kobo": limit,
                "amount_kobo": amount_kobo,
            },
            http=409,
        )
