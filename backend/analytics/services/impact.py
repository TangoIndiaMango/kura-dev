"""Impact rollups and owner savings estimates."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from analytics.models import MonthlyImpactMetric

# Petrol combustion factor (gCO2/L ÷ 1000), matches seeded impact inputs.
CO2_KG_PER_LITRE = "2.31"

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
    """Owner-facing savings estimate from the account's completed swaps.

    Same petrol factors as the cooperative estimate so the two screens agree.
    """
    from django.conf import settings
    from django.db.models import Count, Min

    from analytics.services.cooperative_savings import estimate_savings_kobo
    from mobility.models import Swap

    agg = Swap.objects.filter(
        account=account, status=Swap.Status.COMPLETED
    ).aggregate(n=Count("id"), first=Min("completed_at"))
    swaps = int(agg["n"] or 0)
    savings, _note = estimate_savings_kobo(account_ids=[account.id])
    litres = Decimal(str(getattr(settings, "COOP_PETROL_LITRES_PER_SWAP", 1.2) or 1.2))
    co2 = (litres * swaps * Decimal(CO2_KG_PER_LITRE)).quantize(Decimal("0.001"))
    first = timezone.localdate(agg["first"]) if agg["first"] else None
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
