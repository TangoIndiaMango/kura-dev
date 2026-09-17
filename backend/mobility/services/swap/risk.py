"""F4 E4.9 / E4.10 — swap velocity block + geo-impossible flag."""
from __future__ import annotations

import math
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Hub, Swap, VehicleType
from risk.models import RiskRule
from risk.services import RiskService
from risk.services.velocity_grants import try_consume_velocity_grant

_LAGOS = ZoneInfo("Africa/Lagos")

_VELOCITY_DEFAULTS = {
    "MAX_SWAPS_PER_VEHICLE_DAY": 4,
    "MIN_MINUTES_BETWEEN_SWAPS": 45,
}
_GEO_DEFAULTS = {
    "MAX_SPEED_KMH": 80,
    "MAX_SPEED_KMH_BOAT": 40,
}
_OPEN_SWAP = {
    Swap.Status.STARTED,
    Swap.Status.RETURN_RECORDED,
    Swap.Status.ISSUED,
}


def _enabled_params(code: str, defaults: dict) -> dict | None:
    """None ⇒ rule missing/disabled — skip enforcement."""
    RiskService.ensure_rules()
    rule = RiskRule.objects.filter(code=code).only("params", "enabled").first()
    if rule is None or not rule.enabled:
        return None
    raw = rule.params if isinstance(rule.params, dict) else {}
    return {**defaults, **raw}


def _wat_day_bounds(now: datetime | None = None) -> tuple[datetime, datetime]:
    local = (now or timezone.now()).astimezone(_LAGOS)
    start = datetime.combine(local.date(), time.min, tzinfo=_LAGOS)
    end = start + timedelta(days=1)
    return start, end


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def _block_or_grant(
    *,
    vehicle_id,
    account,
    reason: str,
    message: str,
    context: dict,
    retry_after_seconds: int,
) -> None:
    if try_consume_velocity_grant(vehicle_id=vehicle_id) is not None:
        return
    RiskService.emit(
        rule_code="SWAP_VELOCITY",
        subject_type="vehicle",
        subject_id=str(vehicle_id),
        account=account,
        severity="HIGH",
        context={"reason": reason, **context},
        action_taken="BLOCK",
    )
    raise DomainError(
        "THROTTLED",
        message,
        details={"retry_after_seconds": retry_after_seconds},
        http=429,
    )


def assert_swap_velocity(*, vehicle_id, account=None) -> None:
    """E4.9 — block when daily count or min gap is exceeded (ops grant may allow)."""
    params = _enabled_params("SWAP_VELOCITY", _VELOCITY_DEFAULTS)
    if params is None:
        return

    max_day = int(params["MAX_SWAPS_PER_VEHICLE_DAY"])
    min_gap = int(params["MIN_MINUTES_BETWEEN_SWAPS"])
    day_start, day_end = _wat_day_bounds()

    completed_today = Swap.objects.filter(
        vehicle_id=vehicle_id,
        status=Swap.Status.COMPLETED,
        completed_at__gte=day_start,
        completed_at__lt=day_end,
    ).count()
    open_today = Swap.objects.filter(
        vehicle_id=vehicle_id,
        status__in=_OPEN_SWAP,
    ).filter(
        Q(started_at__gte=day_start, started_at__lt=day_end)
        | Q(started_at__isnull=True, created_at__gte=day_start, created_at__lt=day_end)
    ).count()
    day_count = completed_today + open_today
    if day_count >= max_day:
        _block_or_grant(
            vehicle_id=vehicle_id,
            account=account,
            reason="MAX_SWAPS_PER_VEHICLE_DAY",
            message=f"Vehicle swap limit reached ({max_day}/day).",
            context={"count": day_count, "limit": max_day},
            retry_after_seconds=_seconds_until(day_end),
        )
        return

    last = (
        Swap.objects.filter(
            vehicle_id=vehicle_id,
            status=Swap.Status.COMPLETED,
        )
        .exclude(completed_at__isnull=True)
        .order_by("-completed_at")
        .only("completed_at")
        .first()
    )
    if last is None or last.completed_at is None:
        return

    elapsed = timezone.now() - last.completed_at
    need = timedelta(minutes=min_gap)
    if elapsed < need:
        wait = int((need - elapsed).total_seconds())
        _block_or_grant(
            vehicle_id=vehicle_id,
            account=account,
            reason="MIN_MINUTES_BETWEEN_SWAPS",
            message=f"Wait {min_gap} minutes between swaps for this vehicle.",
            context={
                "elapsed_seconds": int(elapsed.total_seconds()),
                "min_minutes": min_gap,
            },
            retry_after_seconds=max(wait, 1),
        )


def flag_geo_impossible_if_needed(
    *,
    vehicle_id,
    hub: Hub,
    account=None,
    swap_id=None,
    vehicle_type: str = "",
) -> bool:
    """E4.10 — flag only; never block completion."""
    params = _enabled_params("GEO_IMPOSSIBLE", _GEO_DEFAULTS)
    if params is None:
        return False

    prev = (
        Swap.objects.filter(
            vehicle_id=vehicle_id,
            status=Swap.Status.COMPLETED,
        )
        .exclude(pk=swap_id)
        .select_related("hub")
        .order_by("-completed_at")
        .first()
    )
    if prev is None or prev.completed_at is None or prev.hub_id == hub.id:
        return False

    prev_hub = prev.hub
    distance_km = _haversine_km(prev_hub.lat, prev_hub.lng, hub.lat, hub.lng)
    if distance_km < 0.05:
        return False

    hours = (timezone.now() - prev.completed_at).total_seconds() / 3600.0
    speed = float("inf") if hours <= 0 else distance_km / hours
    limit = float(
        params["MAX_SPEED_KMH_BOAT"]
        if vehicle_type == VehicleType.BOAT
        else params["MAX_SPEED_KMH"]
    )
    if speed <= limit:
        return False

    RiskService.emit(
        rule_code="GEO_IMPOSSIBLE",
        subject_type="swap" if swap_id else "vehicle",
        subject_id=str(swap_id or vehicle_id),
        account=account,
        severity="HIGH",
        context={
            "from_hub": prev_hub.code,
            "to_hub": hub.code,
            "distance_km": round(distance_km, 2),
            "implied_kmh": round(speed, 1) if speed != float("inf") else None,
            "limit_kmh": limit,
            "prev_completed_at": prev.completed_at.isoformat(),
        },
        action_taken="FLAG",
    )
    return True


def _seconds_until(when: datetime) -> int:
    return max(int((when - timezone.now()).total_seconds()), 1)
