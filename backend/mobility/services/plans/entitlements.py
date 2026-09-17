"""Active plan entitlement helpers — reservation + settle."""
from __future__ import annotations

from django.db.models import QuerySet
from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Subscription, Vehicle


def active_subscriptions_qs(*, vehicle: Vehicle | None = None) -> QuerySet[Subscription]:
    now = timezone.now()
    qs = Subscription.objects.filter(
        status=Subscription.Status.ACTIVE,
        ends_at__gt=now,
    )
    if vehicle is not None:
        qs = qs.filter(vehicle=vehicle)
    return qs.select_related("plan", "account", "vehicle")


def get_active_subscription(*, vehicle: Vehicle) -> Subscription | None:
    return (
        active_subscriptions_qs(vehicle=vehicle)
        .select_for_update()
        .order_by("-ends_at")
        .first()
    )


def assert_plan_covers_swap(*, vehicle: Vehicle) -> Subscription:
    sub = get_active_subscription(vehicle=vehicle)
    if sub is None:
        raise DomainError(
            "PLAN_REQUIRED",
            "No active subscription covering this vehicle.",
            http=409,
        )
    if sub.swaps_allowance is not None and sub.swaps_used >= sub.swaps_allowance:
        raise DomainError(
            "PLAN_EXHAUSTED",
            "Plan swap allowance exhausted.",
            http=409,
        )
    return sub
