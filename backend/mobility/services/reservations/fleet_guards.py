"""Soft fleet guards — no-op when assignment / limits are unset.

Soft (intentional): daily swap/spend caps gate reserve + assignment re-check at
swap start. They are not wallet ledger holds — wallet/plan still settles each swap.
Unset limit / null assignment = unrestricted on the account.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Count, Sum
from django.utils import timezone

from accounts.models import Driver
from core.exceptions import DomainError
from mobility.models import Reservation, Swap


def assert_driver_may_use_vehicle(*, driver, vehicle) -> None:
    assigned_id = getattr(vehicle, "assigned_driver_id", None)
    if not assigned_id:
        return
    if driver is None or driver.pk != assigned_id:
        raise DomainError(
            "VEHICLE_ASSIGNED",
            "This vehicle is assigned to another driver on the account.",
            details={
                "vehicle_id": str(vehicle.id),
                "assigned_driver_id": str(assigned_id),
            },
            http=409,
        )


def _local_day_bounds():
    """Hub-local (Lagos) day — TIME_ZONE is UTC, which would reset caps at 01:00 WAT."""
    tz = ZoneInfo(getattr(settings, "DISPLAY_TIME_ZONE", "Africa/Lagos"))
    today = timezone.now().astimezone(tz).date()
    start = datetime.combine(today, time.min, tzinfo=tz)
    end = start + timedelta(days=1)
    return start, end


def assert_driver_within_limits(*, driver, fee_kobo: int = 0) -> None:
    if driver is None:
        return
    swap_cap = driver.daily_swap_limit
    spend_cap = driver.daily_spend_kobo_limit
    if swap_cap is None and spend_cap is None:
        return

    # Serialize concurrent reserves for the same driver inside the caller's atomic.
    locked = Driver.objects.select_for_update().filter(pk=driver.pk).first()
    if locked is None:
        return
    swap_cap = locked.daily_swap_limit
    spend_cap = locked.daily_spend_kobo_limit
    if swap_cap is None and spend_cap is None:
        return

    day_start, day_end = _local_day_bounds()
    completed = Swap.objects.filter(
        driver_id=locked.pk,
        status=Swap.Status.COMPLETED,
        completed_at__gte=day_start,
        completed_at__lt=day_end,
    ).aggregate(swaps=Count("id"), spend=Sum("amount_kobo"))
    holds = Reservation.objects.filter(
        driver_id=locked.pk,
        status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
        expires_at__gt=timezone.now(),
    ).aggregate(n=Count("id"), held=Sum("hold_amount_kobo"))

    if swap_cap is not None:
        used = int(completed["swaps"] or 0) + int(holds["n"] or 0)
        if used >= int(swap_cap):
            raise DomainError(
                "DRIVER_SWAP_LIMIT",
                "Daily swap limit reached for this driver.",
                details={"limit": int(swap_cap), "used": used},
                http=409,
            )

    if spend_cap is not None:
        projected = (
            int(completed["spend"] or 0)
            + int(holds["held"] or 0)
            + max(0, int(fee_kobo))
        )
        if projected > int(spend_cap):
            raise DomainError(
                "DRIVER_SPEND_LIMIT",
                "Daily spend limit would be exceeded for this driver.",
                details={
                    "limit_kobo": int(spend_cap),
                    "spent_kobo": int(completed["spend"] or 0),
                    "held_kobo": int(holds["held"] or 0),
                    "fee_kobo": int(fee_kobo),
                },
                http=409,
            )
