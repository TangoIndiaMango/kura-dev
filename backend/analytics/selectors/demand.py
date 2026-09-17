from __future__ import annotations

from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import ExtractHour
from django.utils import timezone

from accounts.selectors.scope import hub_ids_for
from mobility.models import Hub, Swap


def hub_demand_forecast(*, user, lookback_days: int = 28) -> list[dict]:
    days = max(7, min(lookback_days, 90))
    hubs = Hub.objects.order_by("code")
    scope = hub_ids_for(user)
    if scope is not None:
        hubs = hubs.filter(id__in=scope)

    since = timezone.now() - timedelta(days=days)
    swaps = Swap.objects.filter(
        hub_id__in=hubs.values("id"),
        status=Swap.Status.COMPLETED,
        completed_at__gte=since,
    )
    totals = {
        row["hub_id"]: row["count"]
        for row in swaps.values("hub_id").annotate(count=Count("id"))
    }
    hourly_rows = (
        swaps.annotate(hour=ExtractHour("completed_at"))
        .values("hub_id", "hour")
        .annotate(count=Count("id"))
        .order_by("hub_id", "-count", "hour")
    )
    peak_hours: dict = {}
    for row in hourly_rows:
        peak_hours.setdefault(row["hub_id"], row["hour"])

    return [
        {
            "hub_id": str(hub.id),
            "hub_code": hub.code,
            "hub_name": hub.name,
            "expected_swaps_next_24h": (
                totals.get(hub.id, 0) + days - 1
            ) // days,
            "peak_hour_utc": peak_hours.get(hub.id),
            "historical_swaps": totals.get(hub.id, 0),
            "lookback_days": days,
            "method": "trailing_daily_average",
            "confidence": (
                "MEDIUM"
                if totals.get(hub.id, 0) >= days
                else "LOW"
            ),
        }
        for hub in hubs
    ]
