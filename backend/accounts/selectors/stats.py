"""Aggregate stats for admin module KPI / chart panels."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from django.db.models import Count
from django.db.models.functions import TruncWeek
from django.utils import timezone
from django.utils.dateparse import parse_date

from accounts.models import Account, Role, User
from accounts.services.users import staff_users_qs


def _parse_bound(value: str | None, *, end: bool = False):
    if not value:
        return None
    d = parse_date(value)
    if not d:
        return None
    if end:
        return timezone.make_aware(datetime.combine(d, datetime.max.time()))
    return timezone.make_aware(datetime.combine(d, datetime.min.time()))


def _apply_created_range(qs, start_date: str | None, end_date: str | None):
    start = _parse_bound(start_date)
    end = _parse_bound(end_date, end=True)
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lte=end)
    return qs


def account_stats(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    qs = Account.objects.all()
    scoped = _apply_created_range(qs, start_date, end_date)

    by_status = {
        row["status"]: row["c"]
        for row in scoped.values("status").annotate(c=Count("id"))
    }
    by_kyc = {
        row["kyc_status"]: row["c"]
        for row in scoped.values("kyc_status").annotate(c=Count("id"))
    }

    # Weekly registrations in range (or last 6 weeks if no range)
    chart_qs = scoped
    if not start_date and not end_date:
        chart_qs = qs.filter(created_at__gte=timezone.now() - timedelta(weeks=6))

    weeks = (
        chart_qs.annotate(week=TruncWeek("created_at"))
        .values("week")
        .annotate(count=Count("id"))
        .order_by("week")
    )
    registrations = [
        {
            "label": row["week"].strftime("%d %b") if row["week"] else "—",
            "count": row["count"],
        }
        for row in weeks
        if row["week"]
    ]

    return {
        "totals": {
            "all": scoped.count(),
            "active": by_status.get(Account.Status.ACTIVE, 0),
            "suspended": by_status.get(Account.Status.SUSPENDED, 0),
            "pending": by_status.get(Account.Status.PENDING, 0),
            "deregistered": by_status.get(Account.Status.DEREGISTERED, 0),
        },
        "kyc": {
            "none": by_kyc.get(Account.KycStatus.NONE, 0),
            "provisional": by_kyc.get(Account.KycStatus.PROVISIONAL, 0),
            "pending": by_kyc.get(Account.KycStatus.PENDING, 0)
            + by_kyc.get(Account.KycStatus.PENDING_PSP, 0),
            "verified": by_kyc.get(Account.KycStatus.VERIFIED, 0),
            "rejected": by_kyc.get(Account.KycStatus.REJECTED, 0),
        },
        "registrations": registrations,
    }


def staff_user_stats(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    qs = _apply_created_range(staff_users_qs(), start_date, end_date)
    active = qs.filter(is_active=True, last_login__isnull=False).count()
    invited = qs.filter(is_active=True, last_login__isnull=True).count()
    suspended = qs.filter(is_active=False).count()
    return {
        "totals": {
            "all": qs.count(),
            "active": active,
            "invited": invited,
            "suspended": suspended,
            "roles": Role.objects.count(),
        }
    }


def role_stats() -> dict[str, Any]:
    qs = Role.objects.all()
    system = qs.filter(is_system=True).count()
    custom = qs.filter(is_system=False).count()
    return {
        "totals": {
            "all": qs.count(),
            "system": system,
            "custom": custom,
            "users_assigned": User.objects.filter(is_staff=True).count(),
        }
    }


def account_detail_stats(
    account: Account,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    from django.db.models import Avg, ExpressionWrapper, F, FloatField, Sum
    from django.db.models.functions import TruncDate
    from mobility.models import Swap

    today = timezone.now().date()
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

    scoped_swaps = account.swaps.filter(
        status=Swap.Status.COMPLETED,
        completed_at__gte=start_dt,
        completed_at__lte=end_dt,
    )

    total_swaps = scoped_swaps.count()
    days_count = max(1, (end_d - start_d).days + 1)
    swaps_per_day = round(total_swaps / days_count, 1)

    aggregates = scoped_swaps.aggregate(
        total_spend=Sum("amount_kobo"),
        avg_soc=Avg("returned_charge_pct"),
    )
    avg_soc = aggregates["avg_soc"]
    avg_returned_soc = round(float(avg_soc), 1) if avg_soc is not None else 0.0

    # Same petrol factors as the owner's "Saved vs petrol" and cooperative estimates.
    from django.conf import settings

    litres_per_swap = float(getattr(settings, "COOP_PETROL_LITRES_PER_SWAP", 1.2) or 1.2)
    petrol_kobo_per_litre = int(
        getattr(settings, "COOP_PETROL_PRICE_KOBO_PER_LITRE", 85_000) or 85_000
    )
    fuel_saved_kobo = int(
        total_swaps * int(round(litres_per_swap * 1000)) * petrol_kobo_per_litre // 1000
    )

    energy_expr = ExpressionWrapper(
        (F("issued_charge_pct") - F("returned_charge_pct")) * 3.24 / 100.0,
        output_field=FloatField(),
    )

    daily_rows = (
        scoped_swaps.annotate(day=TruncDate("completed_at"))
        .values("day")
        .annotate(
            c=Count("id"),
            energy=Sum(energy_expr),
        )
    )
    daily_map = {row["day"]: row for row in daily_rows if row["day"]}

    daily_metrics = []
    cur = start_d
    while cur <= end_d:
        row = daily_map.get(cur)
        c = row["c"] if row else 0
        energy = round(float(row["energy"] or 0.0), 1) if row else 0.0
        daily_metrics.append({
            "date": cur.isoformat(),
            "label": cur.strftime("%d %b"),
            "swaps": c,
            "energy_kwh": energy,
            "target": 2,
        })
        cur += timedelta(days=1)

    total_energy_kwh = round(sum(d["energy_kwh"] for d in daily_metrics), 1)

    from django.db.models import Case, When
    soc_aggregates = scoped_swaps.aggregate(
        optimal=Count(Case(When(returned_charge_pct__gte=20, then=1))),
        adequate=Count(Case(When(returned_charge_pct__gte=12, returned_charge_pct__lt=20, then=1))),
        critical=Count(Case(When(returned_charge_pct__lt=12, then=1))),
    )
    soc_distribution = [
        {"name": "Optimal (>20%)", "value": soc_aggregates["optimal"] or 0, "color": "#0D7C8F"},
        {"name": "Adequate (12–20%)", "value": soc_aggregates["adequate"] or 0, "color": "#4FC3F7"},
        {"name": "Critical (<12%)", "value": soc_aggregates["critical"] or 0, "color": "#E74C3C"},
    ]

    from accounts.selectors.spend import (
        fleet_money_breakdown,
        spend_breakdown_from_swaps,
    )

    spend = spend_breakdown_from_swaps(
        scoped_swaps, start_d=start_d, end_d=end_d
    )
    return {
        "status": account.status,
        "kyc_status": account.kyc_status,
        "drivers_count": account.drivers.count(),
        "vehicles_count": account.vehicles.count(),
        "identity_docs_count": account.identity_documents.count(),
        "swaps_count": total_swaps,
        "swaps_per_day": swaps_per_day,
        "energy_kwh_total": total_energy_kwh,
        "fuel_saved_kobo": fuel_saved_kobo,
        "petrol_kobo_per_litre": petrol_kobo_per_litre,
        "avg_returned_soc": avg_returned_soc,
        "soc_distribution": soc_distribution,
        "daily_metrics": daily_metrics,
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "spend_amount_kobo": spend["amount_kobo"],
        "spend_by_vehicle": spend["by_vehicle"],
        "spend_by_driver": spend["by_driver"],
        # Swap + plan fees per hub-local day, same numbers the owner sees in the app.
        "money": fleet_money_breakdown(
            account, start_date=start_d.isoformat(), end_date=end_d.isoformat()
        ),
    }

