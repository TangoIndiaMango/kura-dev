"""Discount eligibility helpers — keep DiscountService lean."""
from __future__ import annotations

from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Plan
from mobility.models import DiscountCampaign

_PERIOD_TO_OPTION = {
    "day": "daily",
    "daily": "daily",
    "week": "weekly",
    "weekly": "weekly",
    "month": "monthly",
    "monthly": "monthly",
    "swap": "swap",
    "pps": "pps",
}


def normalize_code(raw: str) -> str:
    return (raw or "").strip().upper().replace(" ", "")


def channel_allowed(channels: str, channel: str) -> bool:
    parts = [p.strip().lower() for p in channels.replace("|", "·").split("·")]
    parts = [p for chunk in parts for p in chunk.split(",") if p]
    return any(p == channel.lower() for p in parts)


def period_key(period: str) -> str:
    return _PERIOD_TO_OPTION.get((period or "").strip().lower(), (period or "").lower())


def option_id_for_plan(plan: Plan | None, period: str) -> str:
    if plan is not None:
        if plan.period == Plan.Period.SWAP:
            return "pps"
        return _PERIOD_TO_OPTION.get(plan.period, plan.period)
    key = period_key(period)
    return "pps" if key == "swap" else key


def value_label(d: DiscountCampaign) -> str:
    if d.value_type == DiscountCampaign.ValueType.PERCENT:
        return f"{d.value}%"
    return f"₦{d.value // 100:,}"


def compute_discount_kobo(*, discount: DiscountCampaign, list_price_kobo: int) -> int:
    if list_price_kobo <= 0:
        return 0
    if discount.value_type == DiscountCampaign.ValueType.PERCENT:
        pct = min(100, int(discount.value))
        return max(0, (list_price_kobo * pct) // 100)
    return min(list_price_kobo, int(discount.value))


def assert_live_status(discount: DiscountCampaign) -> None:
    now = timezone.now()
    if discount.status == DiscountCampaign.Status.SCHEDULED:
        raise DomainError("DISCOUNT_NOT_LIVE", "This code is not live yet.", http=409)
    if discount.status == DiscountCampaign.Status.EXPIRED:
        raise DomainError("DISCOUNT_EXPIRED", "This code has expired.", http=409)
    if discount.status == DiscountCampaign.Status.PAUSED:
        raise DomainError("DISCOUNT_PAUSED", "This code is paused.", http=409)
    if discount.status != DiscountCampaign.Status.ACTIVE:
        raise DomainError(
            "DISCOUNT_UNAVAILABLE", "This code is not available.", http=409
        )
    if discount.starts_at and discount.starts_at > now:
        raise DomainError("DISCOUNT_NOT_LIVE", "This code is not live yet.", http=409)
    if discount.ends_at and discount.ends_at <= now:
        raise DomainError("DISCOUNT_EXPIRED", "This code has expired.", http=409)


def assert_eligible(
    *,
    discount: DiscountCampaign,
    period: str,
    channel: str,
    plan: Plan | None,
    vehicle_count: int,
    granted_segment_id: str,
) -> None:
    if not channel_allowed(discount.channels, channel):
        raise DomainError(
            "DISCOUNT_CHANNEL",
            f"Not valid on {channel}. Use: {discount.channels}.",
            http=409,
        )
    pkey = period_key(period)
    periods = [str(p).lower() for p in (discount.periods or [])]
    ok = (
        pkey in periods
        or (pkey == "swap" and "pps" in periods)
        or (pkey == "pps" and "swap" in periods)
    )
    if not ok:
        raise DomainError(
            "DISCOUNT_PERIOD",
            f"Not valid for {pkey} payments.",
            http=409,
        )
    if not discount.applies_to_all_plans and pkey not in {"swap", "pps"}:
        option = option_id_for_plan(plan, period)
        allowed = [str(x) for x in (discount.plan_option_ids or [])]
        if option not in allowed:
            raise DomainError("DISCOUNT_PLAN", "Not valid for this plan.", http=409)
    if discount.audience == DiscountCampaign.Audience.FLEET:
        min_v = discount.fleet_min_vehicles or 2
        if vehicle_count < min_v:
            raise DomainError(
                "DISCOUNT_AUDIENCE",
                f"Needs {min_v}+ vehicles on the account.",
                http=409,
            )
    if discount.audience == DiscountCampaign.Audience.SEGMENT:
        if not discount.segment_id:
            raise DomainError(
                "DISCOUNT_AUDIENCE",
                "Segment discount is misconfigured.",
                http=409,
            )
        if not granted_segment_id or granted_segment_id != discount.segment_id:
            raise DomainError(
                "DISCOUNT_AUDIENCE",
                "Not eligible for this segment code.",
                http=409,
            )
