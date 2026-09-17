"""Shared plan-billing helpers — keep billing/jobs lean."""
from __future__ import annotations

from accounts.services.auth import assert_pin_grant
from core.exceptions import DomainError
from mobility.models import Plan, Subscription, Vehicle


def owner_user(account):
    return getattr(account, "owner_user", None)


def duration_days(plan: Plan) -> int:
    if plan.duration_days and plan.duration_days > 0:
        return int(plan.duration_days)
    mapping = {Plan.Period.DAY: 1, Plan.Period.WEEK: 7, Plan.Period.MONTH: 30}
    if plan.period not in mapping:
        raise DomainError(
            "VALIDATION_ERROR",
            "Pay-per-swap catalogue rows cannot be purchased as subscriptions.",
            http=400,
        )
    return mapping[plan.period]


def vehicle_count(account) -> int:
    return Vehicle.objects.filter(account=account).count()


def require_wallet_pin(*, account, pin_grant: str, skip_pin: bool) -> None:
    """Require a short-lived pin_grant for rider-initiated wallet debit."""
    if skip_pin:
        return
    owner_id = getattr(account, "owner_user_id", None)
    if owner_id is None:
        raise DomainError(
            "ACCOUNT_REQUIRED",
            "Account owner is required for PIN confirmation.",
            http=400,
        )
    assert_pin_grant(token=pin_grant, user_id=owner_id)


def apply_queued_plan(sub: Subscription) -> bool:
    """Apply a queued plan at period end. Mutates in-memory; caller saves."""
    if sub.queued_plan_id is None:
        return False
    queued = sub.queued_plan
    if queued is None or queued.period == Plan.Period.SWAP or not queued.is_active:
        sub.queued_plan = None
        return False
    sub.plan = queued
    sub.queued_plan = None
    sub.swaps_allowance = queued.swap_allowance
    sub.swaps_used = 0
    return True
