"""Account spend attribution by vehicle / driver — same Swap rows, soft grouping."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from django.db.models import Count, QuerySet, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date

from accounts.models import Account
from mobility.models import Swap


def _day_window(
    *, start_date: str | None, end_date: str | None
) -> tuple[Any, Any, Any, Any]:
    today = timezone.localdate()
    end_d = parse_date(end_date) if end_date else today
    if not end_d:
        end_d = today
    start_d = parse_date(start_date) if start_date else (end_d - timedelta(days=13))
    if not start_d or start_d > end_d:
        start_d = end_d - timedelta(days=13)
    if (end_d - start_d).days > 90:
        start_d = end_d - timedelta(days=89)
    start_dt = timezone.make_aware(datetime.combine(start_d, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(end_d, datetime.max.time()))
    return start_d, end_d, start_dt, end_dt


def spend_breakdown_from_swaps(
    scoped: QuerySet[Swap],
    *,
    start_d,
    end_d,
) -> dict[str, Any]:
    totals = scoped.aggregate(swaps=Count("id"), spend=Sum("amount_kobo"))
    by_vehicle = [
        {
            "vehicle_id": str(row["vehicle_id"]) if row["vehicle_id"] else None,
            "plate": row["vehicle__registration_plate"] or "—",
            "swaps": row["swaps"],
            "amount_kobo": int(row["spend"] or 0),
        }
        for row in scoped.values("vehicle_id", "vehicle__registration_plate")
        .annotate(swaps=Count("id"), spend=Sum("amount_kobo"))
        .order_by("-spend")[:50]
    ]
    by_driver = [
        {
            "driver_id": str(row["driver_id"]) if row["driver_id"] else None,
            "name": (
                f"{(row['driver__user__first_name'] or '').strip()} "
                f"{(row['driver__user__last_name'] or '').strip()}"
            ).strip()
            or (row["driver__user__phone"] or "—"),
            "swaps": row["swaps"],
            "amount_kobo": int(row["spend"] or 0),
        }
        for row in scoped.values(
            "driver_id",
            "driver__user__first_name",
            "driver__user__last_name",
            "driver__user__phone",
        )
        .annotate(swaps=Count("id"), spend=Sum("amount_kobo"))
        .order_by("-spend")[:50]
    ]
    return {
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "swaps_count": totals["swaps"] or 0,
        "amount_kobo": int(totals["spend"] or 0),
        "by_vehicle": by_vehicle,
        "by_driver": by_driver,
    }


def account_spend_breakdown(
    account: Account,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    scoped: QuerySet[Swap] | None = None,
) -> dict[str, Any]:
    start_d, end_d, start_dt, end_dt = _day_window(
        start_date=start_date, end_date=end_date
    )
    qs = scoped
    if qs is None:
        qs = account.swaps.filter(
            status=Swap.Status.COMPLETED,
            completed_at__gte=start_dt,
            completed_at__lte=end_dt,
        )
    return spend_breakdown_from_swaps(qs, start_d=start_d, end_d=end_d)


def _display_tz():
    from zoneinfo import ZoneInfo

    from django.conf import settings

    return ZoneInfo(getattr(settings, "DISPLAY_TIME_ZONE", "Africa/Lagos"))


def _local_window(*, start_date: str | None, end_date: str | None):
    """Same clamping as _day_window, but bounds are hub-local (Lagos) days."""
    tz = _display_tz()
    today = timezone.now().astimezone(tz).date()
    end_d = parse_date(end_date) if end_date else today
    end_d = end_d or today
    start_d = parse_date(start_date) if start_date else end_d - timedelta(days=13)
    if not start_d or start_d > end_d:
        start_d = end_d - timedelta(days=13)
    if (end_d - start_d).days > 90:
        start_d = end_d - timedelta(days=89)
    start_dt = datetime.combine(start_d, datetime.min.time(), tzinfo=tz)
    end_dt = datetime.combine(end_d + timedelta(days=1), datetime.min.time(), tzinfo=tz)
    return start_d, end_d, start_dt, end_dt


def _driver_name(first: str | None, last: str | None, phone: str | None) -> str:
    return f"{(first or '').strip()} {(last or '').strip()}".strip() or (phone or "—")


def fleet_money_breakdown(
    account: Account,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """What an account paid KURA per day: swap fees + plan fees, by vehicle/driver/mode.

    Swap fees come from COMPLETED swaps (reversed swaps drop out); plan fees from
    SUCCESS PLAN payments. Days are hub-local so a swap at 00:30 WAT lands on the
    right day. Plan-covered swaps count as swaps with ₦0 fee.
    """
    from django.db.models.functions import TruncDate

    from finance.models import Payment

    tz = _display_tz()
    start_d, end_d, start_dt, end_dt = _local_window(
        start_date=start_date, end_date=end_date
    )
    swaps = account.swaps.filter(
        status=Swap.Status.COMPLETED,
        completed_at__gte=start_dt,
        completed_at__lt=end_dt,
    )
    plan_payments = Payment.objects.filter(
        account=account,
        purpose="PLAN",
        status=Payment.Status.SUCCESS,
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    )

    daily: dict = {}
    for row in (
        swaps.annotate(day=TruncDate("completed_at", tzinfo=tz))
        .values("day")
        .annotate(n=Count("id"), fees=Sum("amount_kobo"))
    ):
        daily[row["day"]] = {"swaps": row["n"], "swap_fees_kobo": int(row["fees"] or 0)}
    plan_by_day = {
        row["day"]: int(row["fees"] or 0)
        for row in plan_payments.annotate(day=TruncDate("created_at", tzinfo=tz))
        .values("day")
        .annotate(fees=Sum("amount_kobo"))
    }
    days = []
    cur = start_d
    while cur <= end_d:
        s = daily.get(cur, {"swaps": 0, "swap_fees_kobo": 0})
        plan = plan_by_day.get(cur, 0)
        days.append(
            {
                "date": cur.isoformat(),
                "swaps": s["swaps"],
                "swap_fees_kobo": s["swap_fees_kobo"],
                "plan_fees_kobo": plan,
                "total_kobo": s["swap_fees_kobo"] + plan,
            }
        )
        cur += timedelta(days=1)

    plan_by_vehicle = {
        row["subscriptions__vehicle_id"]: int(row["fees"] or 0)
        for row in plan_payments.values("subscriptions__vehicle_id").annotate(
            fees=Sum("amount_kobo")
        )
    }
    by_vehicle = []
    for row in swaps.values("vehicle_id", "vehicle__registration_plate").annotate(
        n=Count("id"), fees=Sum("amount_kobo")
    ):
        plan = plan_by_vehicle.pop(row["vehicle_id"], 0)
        by_vehicle.append(
            {
                "vehicle_id": str(row["vehicle_id"]),
                "plate": row["vehicle__registration_plate"] or "—",
                "swaps": row["n"],
                "swap_fees_kobo": int(row["fees"] or 0),
                "plan_fees_kobo": plan,
                "total_kobo": int(row["fees"] or 0) + plan,
            }
        )
    # Vehicles that bought a plan but did not swap in the window.
    if plan_by_vehicle:
        from mobility.models import Vehicle

        plates = dict(
            Vehicle.objects.filter(pk__in=[k for k in plan_by_vehicle if k]).values_list(
                "id", "registration_plate"
            )
        )
        for vid, plan in plan_by_vehicle.items():
            by_vehicle.append(
                {
                    "vehicle_id": str(vid) if vid else None,
                    "plate": plates.get(vid, "—") if vid else "Not linked to a vehicle",
                    "swaps": 0,
                    "swap_fees_kobo": 0,
                    "plan_fees_kobo": plan,
                    "total_kobo": plan,
                }
            )
    by_vehicle.sort(key=lambda r: r["total_kobo"], reverse=True)

    by_driver = [
        {
            "driver_id": str(row["driver_id"]) if row["driver_id"] else None,
            "name": _driver_name(
                row["driver__user__first_name"],
                row["driver__user__last_name"],
                row["driver__user__phone"],
            ),
            "swaps": row["n"],
            "swap_fees_kobo": int(row["fees"] or 0),
        }
        for row in swaps.values(
            "driver_id",
            "driver__user__first_name",
            "driver__user__last_name",
            "driver__user__phone",
        )
        .annotate(n=Count("id"), fees=Sum("amount_kobo"))
        .order_by("-fees")
    ]
    by_payment_mode = [
        {"mode": row["payment_mode"], "swaps": row["n"], "amount_kobo": int(row["fees"] or 0)}
        for row in swaps.values("payment_mode")
        .annotate(n=Count("id"), fees=Sum("amount_kobo"))
        .order_by("-fees")
    ]

    swap_fees = sum(d["swap_fees_kobo"] for d in days)
    plan_fees = sum(d["plan_fees_kobo"] for d in days)
    swap_count = sum(d["swaps"] for d in days)
    return {
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "totals": {
            "swaps": swap_count,
            "swap_fees_kobo": swap_fees,
            "plan_fees_kobo": plan_fees,
            "total_kobo": swap_fees + plan_fees,
            "avg_per_day_kobo": (swap_fees + plan_fees) // max(1, len(days)),
        },
        "daily": days,
        "by_vehicle": by_vehicle,
        "by_driver": by_driver,
        "by_payment_mode": by_payment_mode,
        "drivers_today": drivers_usage_today(account),
    }


def drivers_usage_today(account: Account) -> list[dict[str, Any]]:
    """Per-driver usage against soft daily caps (hub-local day, matches fleet guards)."""
    from accounts.models import Driver

    _s, _e, day_start, day_end = _local_window(start_date=None, end_date=None)
    day_start = day_end - timedelta(days=1)
    used = {
        row["driver_id"]: row
        for row in account.swaps.filter(
            status=Swap.Status.COMPLETED,
            completed_at__gte=day_start,
            completed_at__lt=day_end,
        )
        .values("driver_id")
        .annotate(n=Count("id"), fees=Sum("amount_kobo"))
    }
    out = []
    for d in Driver.objects.filter(account=account).select_related("user"):
        row = used.get(d.id, {})
        out.append(
            {
                "driver_id": str(d.id),
                "name": _driver_name(d.user.first_name, d.user.last_name, d.user.phone),
                "swaps": int(row.get("n") or 0),
                "spend_kobo": int(row.get("fees") or 0),
                "daily_swap_limit": d.daily_swap_limit,
                "daily_spend_kobo_limit": d.daily_spend_kobo_limit,
            }
        )
    return out
