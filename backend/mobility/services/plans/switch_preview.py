"""Classify plan changes and build switch previews."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Plan, Subscription
from mobility.services.plans.discounts import DiscountService
from mobility.services.plans.helpers import duration_days, vehicle_count
from mobility.services.plans.pricing import PricingService


class SwitchKind:
    UPGRADE = "UPGRADE"
    DOWNGRADE = "DOWNGRADE"
    LATERAL = "LATERAL"
    CLEAR_QUEUE = "CLEAR_QUEUE"


class SwitchEffective:
    IMMEDIATE = "IMMEDIATE"
    QUEUED = "QUEUED"


@dataclass(frozen=True, slots=True)
class SwitchPreview:
    kind: str
    effective: str
    current_plan_id: str
    current_plan_name: str
    current_list_kobo: int
    target_plan_id: str
    target_plan_name: str
    target_list_kobo: int
    due_kobo: int
    discount_kobo: int
    refund_kobo: int
    keeps_until: datetime
    starts_at: datetime
    pin_required: bool
    message: str
    queued_plan_id: str | None


def _vehicle_type(sub: Subscription) -> str:
    return sub.vehicle.vehicle_model.vehicle_type


def list_kobo_for(*, subscription: Subscription, plan: Plan) -> int:
    return PricingService.resolve_plan_list_kobo(
        vehicle_type=_vehicle_type(subscription), period=plan.period
    )


def classify_switch(*, current: Plan, target: Plan, current_kobo: int, target_kobo: int) -> str:
    if current.id == target.id:
        return SwitchKind.CLEAR_QUEUE
    if target_kobo > current_kobo:
        return SwitchKind.UPGRADE
    if target_kobo < current_kobo:
        return SwitchKind.DOWNGRADE
    if duration_days(target) > duration_days(current):
        return SwitchKind.UPGRADE
    if duration_days(target) < duration_days(current):
        return SwitchKind.DOWNGRADE
    return SwitchKind.LATERAL


def resolve_effective(*, kind: str, immediate: bool | None) -> str:
    """
    Upgrade may start now or wait; downgrade always waits until period end.
    No mid-period refund either way.
    """
    if kind == SwitchKind.CLEAR_QUEUE:
        return SwitchEffective.QUEUED
    if kind == SwitchKind.DOWNGRADE:
        if immediate is True:
            raise DomainError(
                "SWITCH_DOWNGRADE_QUEUED",
                "Downgrades start when your current plan ends. "
                "You keep this plan until then — no mid-period refund.",
                http=409,
            )
        return SwitchEffective.QUEUED
    if kind == SwitchKind.UPGRADE:
        if immediate is False:
            return SwitchEffective.QUEUED
        return SwitchEffective.IMMEDIATE
    # LATERAL — honour explicit choice; default queue.
    if immediate is True:
        return SwitchEffective.IMMEDIATE
    return SwitchEffective.QUEUED


def preview_switch(
    *,
    subscription: Subscription,
    plan: Plan,
    immediate: bool | None = None,
    discount_code: str = "",
    channel: str = "App",
) -> SwitchPreview:
    if subscription.status != Subscription.Status.ACTIVE:
        raise DomainError(
            "INVALID_TRANSITION",
            f"Cannot switch subscription in status {subscription.status}.",
            http=409,
        )
    if plan.period == Plan.Period.SWAP:
        raise DomainError(
            "VALIDATION_ERROR",
            "Cannot switch to pay-per-swap catalogue row.",
            http=400,
        )
    if not plan.is_active:
        raise DomainError("VALIDATION_ERROR", "Plan is not active.", http=400)

    current = subscription.plan
    current_kobo = list_kobo_for(subscription=subscription, plan=current)
    target_kobo = list_kobo_for(subscription=subscription, plan=plan)
    kind = classify_switch(
        current=current,
        target=plan,
        current_kobo=current_kobo,
        target_kobo=target_kobo,
    )
    effective = resolve_effective(kind=kind, immediate=immediate)

    discount_kobo = 0
    due = target_kobo
    code = (discount_code or "").strip()
    if effective == SwitchEffective.IMMEDIATE and code:
        quote = DiscountService.quote(
            code=code,
            list_price_kobo=target_kobo,
            period=plan.period,
            channel=channel,
            plan=plan,
            vehicle_count=vehicle_count(subscription.account),
        )
        discount_kobo, due = quote.discount_kobo, quote.due_kobo
    elif effective != SwitchEffective.IMMEDIATE:
        due = 0

    now = timezone.now()
    if kind == SwitchKind.CLEAR_QUEUE:
        message = "Clears any pending plan change. Your current plan continues."
        starts = subscription.ends_at
    elif effective == SwitchEffective.QUEUED:
        message = (
            f"{plan.name} starts on {subscription.ends_at.date()}. "
            f"You keep {current.name} until then. No refund."
        )
        starts = subscription.ends_at
    else:
        message = (
            f"Starts now: {plan.name}. Charge ₦{due // 100:,} today. "
            f"Unused time on {current.name} is not refunded."
        )
        starts = now

    return SwitchPreview(
        kind=kind,
        effective=effective,
        current_plan_id=str(current.id),
        current_plan_name=current.name,
        current_list_kobo=current_kobo,
        target_plan_id=str(plan.id),
        target_plan_name=plan.name,
        target_list_kobo=target_kobo,
        due_kobo=due,
        discount_kobo=discount_kobo,
        refund_kobo=0,
        keeps_until=subscription.ends_at,
        starts_at=starts,
        pin_required=effective == SwitchEffective.IMMEDIATE,
        message=message,
        queued_plan_id=str(subscription.queued_plan_id)
        if subscription.queued_plan_id
        else None,
    )


def preview_to_dict(preview: SwitchPreview) -> dict:
    return {
        "kind": preview.kind,
        "effective": preview.effective,
        "current_plan_id": preview.current_plan_id,
        "current_plan_name": preview.current_plan_name,
        "current_list_kobo": preview.current_list_kobo,
        "target_plan_id": preview.target_plan_id,
        "target_plan_name": preview.target_plan_name,
        "target_list_kobo": preview.target_list_kobo,
        "due_kobo": preview.due_kobo,
        "discount_kobo": preview.discount_kobo,
        "refund_kobo": preview.refund_kobo,
        "keeps_until": preview.keeps_until.isoformat(),
        "starts_at": preview.starts_at.isoformat(),
        "pin_required": preview.pin_required,
        "message": preview.message,
        "queued_plan_id": preview.queued_plan_id,
    }
