"""Ops command-centre aggregates for Dashboard (30s cache)."""
from __future__ import annotations

from django.core.cache import cache
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractHour
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability
from core.responses import ok
from finance.models import Payment
from mobility.models import Battery, Hub, Swap
from operations.models import Alert, CashDeposit


CACHE_TTL = 30

# Money earned from service. FUND (top-ups) is the rider's own money moving into
# the wallet, and CREDIT_REPAY repays swaps already counted — both would double-count.
REVENUE_PURPOSES = ("SWAP", "PLAN")


def _hourly_completed(start, end) -> list[int]:
    """Completed swaps per Lagos hour (0–23) in [start, end)."""
    counts = [0] * 24
    rows = (
        Swap.objects.filter(
            status=Swap.Status.COMPLETED, completed_at__gte=start, completed_at__lt=end
        )
        .annotate(h=ExtractHour("completed_at", tzinfo=timezone.get_current_timezone()))
        .values("h")
        .annotate(n=Count("id"))
    )
    for row in rows:
        counts[row["h"]] = row["n"]
    return counts


def build_command_centre() -> dict:
    # Lagos business day (TIME_ZONE), not UTC midnight.
    today = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)
    hubs = []
    for hub in Hub.objects.all().order_by("code")[:50]:
        bat = Battery.objects.filter(current_hub=hub).aggregate(
            ready=Count(
                "id",
                filter=Q(status=Battery.Status.AVAILABLE, charge_pct__gte=90),
            ),
            charging=Count("id", filter=Q(status=Battery.Status.CHARGING)),
            issued=Count("id", filter=Q(status=Battery.Status.ISSUED)),
        )
        open_alerts = Alert.objects.filter(
            hub=hub, status__in=[Alert.Status.OPEN, Alert.Status.ACKNOWLEDGED]
        ).count()
        solar_fault = Alert.objects.filter(
            hub=hub,
            kind=Alert.Kind.SOLAR_FAULT,
            status__in=[Alert.Status.OPEN, Alert.Status.ACKNOWLEDGED],
        ).exists()
        hubs.append(
            {
                "id": str(hub.id),
                "code": hub.code,
                "name": hub.name,
                "status": hub.status,
                "ready": bat["ready"] or 0,
                "charging": bat["charging"] or 0,
                "issued": bat["issued"] or 0,
                "open_alerts": open_alerts,
                "last_sync_at": hub.last_sync_at.isoformat()
                if hub.last_sync_at
                else None,
                "solar_capacity_kw": str(hub.solar_capacity_kw),
                "solar_fault": solar_fault,
            }
        )

    today_swaps = Swap.objects.filter(
        status=Swap.Status.COMPLETED, completed_at__gte=today, completed_at__lt=tomorrow
    ).count()
    revenue = (
        Payment.objects.filter(
            created_at__gte=today,
            created_at__lt=tomorrow,
            status=Payment.Status.SUCCESS,
            purpose__in=REVENUE_PURPOSES,
        ).aggregate(t=Sum("amount_kobo"))["t"]
        or 0
    )
    active_alerts = Alert.objects.filter(
        status__in=[Alert.Status.OPEN, Alert.Status.ACKNOWLEDGED, Alert.Status.ESCALATED]
    ).count()
    cash_today = (
        CashDeposit.objects.filter(
            created_at__gte=today, status=CashDeposit.Status.SUCCESS
        ).aggregate(t=Sum("amount_kobo"))["t"]
        or 0
    )

    return {
        "hubs": hubs,
        "kpis": {
            "today_swaps": today_swaps,
            "today_revenue_kobo": int(revenue),
            "active_alerts": active_alerts,
            "today_cash_kobo": int(cash_today),
            "online_hubs": sum(1 for h in hubs if h["status"] == Hub.Status.ONLINE),
            "total_hubs": len(hubs),
        },
        "hourly_swaps": {
            "today": _hourly_completed(today, tomorrow),
            "yesterday": _hourly_completed(yesterday, today),
        },
        "generated_at": timezone.now().isoformat(),
    }


def build_activity(*, limit: int = 25) -> list[dict]:
    rows: list[dict] = []
    for s in (
        Swap.objects.select_related("hub", "vehicle")
        .order_by("-created_at")[:limit]
    ):
        rows.append(
            {
                "id": str(s.id),
                "kind": "swap",
                "title": f"Swap at {s.hub.code}",
                "subtitle": s.vehicle.registration_plate,
                "hub_code": s.hub.code,
                "created_at": s.created_at.isoformat(),
                "link_path": f"/swaps/{s.id}",
            }
        )
    for a in (
        Alert.objects.select_related("hub")
        .filter(status__in=[Alert.Status.OPEN, Alert.Status.ACKNOWLEDGED])
        .order_by("-created_at")[:limit]
    ):
        rows.append(
            {
                "id": str(a.id),
                "kind": "alert",
                "title": a.kind,
                "subtitle": (a.message or "")[:120],
                "hub_code": a.hub.code if a.hub_id else None,
                "created_at": a.created_at.isoformat(),
                "link_path": f"/alerts/{a.id}",
            }
        )
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows[:limit]


class CommandCentreView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "hubs:manage"

    @extend_schema(responses={200: dict})
    def get(self, request):
        payload = cache.get_or_set(
            "ops:command_centre:v3",
            build_command_centre,
            CACHE_TTL,
        )
        return ok(payload)


class OpsActivityView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "hubs:manage"

    @extend_schema(responses={200: dict})
    def get(self, request):
        limit = min(int(request.query_params.get("limit") or 25), 100)
        return ok({"results": build_activity(limit=limit)})
