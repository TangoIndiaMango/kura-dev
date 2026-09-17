"""Impact rollups and owner savings estimates."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from analytics.models import DailyAccountMetric, MonthlyImpactMetric

DISCLAIMER = (
    "Estimate from swap energy vs configured petrol price — not a bank balance."
)


def current_period() -> str:
    return timezone.localdate().strftime("%Y-%m")


def monthly_snapshot(*, period: str | None = None) -> dict:
    period = (period or current_period()).strip()
    row = MonthlyImpactMetric.objects.filter(period=period).first()
    if row is None:
        return {
            "period": period,
            "operators_served": 0,
            "swaps": 0,
            "fuel_savings_kobo": 0,
            "engines_replaced": 0,
            "co2_kg": "0.000",
            "inputs": {},
            "disclaimer": DISCLAIMER,
            "series": _monthly_series(),
        }
    return {
        "period": row.period,
        "operators_served": row.operators_served,
        "swaps": row.swaps,
        "fuel_savings_kobo": row.fuel_savings_kobo,
        "engines_replaced": row.engines_replaced,
        "co2_kg": str(row.co2_kg),
        "inputs": row.inputs or {},
        "disclaimer": DISCLAIMER,
        "series": _monthly_series(),
    }


def _monthly_series(limit: int = 6) -> list[dict]:
    rows = list(MonthlyImpactMetric.objects.order_by("-period")[:limit])
    rows.reverse()
    out: list[dict] = []
    for r in rows:
        label = r.period[5:] if len(r.period) >= 7 else r.period
        out.append(
            {
                "period": r.period,
                "label": label,
                "swaps": r.swaps,
                "co2_t": float(r.co2_kg) / 1000.0,
                "fuel_savings_kobo": r.fuel_savings_kobo,
            }
        )
    return out


def account_impact(*, account) -> dict:
    """Owner-facing savings estimate from daily rollups."""
    agg = DailyAccountMetric.objects.filter(account=account).aggregate(
        swaps=Sum("swaps_completed"),
        savings=Sum("fuel_savings_kobo"),
        co2=Sum("co2_kg_est"),
    )
    swaps = int(agg["swaps"] or 0)
    savings = int(agg["savings"] or 0)
    co2 = agg["co2"] or Decimal("0")
    first = (
        DailyAccountMetric.objects.filter(account=account)
        .order_by("date")
        .values_list("date", flat=True)
        .first()
    )
    weeks = 1.0
    if first is not None:
        days = max(1, (timezone.localdate() - first).days + 1)
        weeks = max(days / 7.0, 1.0)
    return {
        "swaps_completed": swaps,
        "saved_vs_petrol_kobo": savings,
        "saved_since": first.isoformat() if first else None,
        "swaps_per_week": f"{swaps / weeks:.1f}",
        "co2_kg_est": str(co2),
        "disclaimer": DISCLAIMER,
    }
