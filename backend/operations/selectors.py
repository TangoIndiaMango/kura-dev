"""Aggregate stats for admin Alerts KPIs / charts."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date

from accounts.selectors.scope import hub_ids_for
from operations.models import Alert

OPENISH = (Alert.Status.OPEN, Alert.Status.ACKNOWLEDGED, Alert.Status.ESCALATED)


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


def _alerts_for(user=None):
    qs = Alert.objects.all()
    if user is None:
        return qs
    scope = hub_ids_for(user)
    if scope is None:
        return qs
    if not scope:
        return qs.none()
    return qs.filter(hub_id__in=scope)


def alert_stats(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    user=None,
) -> dict[str, Any]:
    live = _alerts_for(user)
    open_qs = live.filter(status=Alert.Status.OPEN)
    period = _apply_created_range(live, start_date, end_date)

    by_severity_rows = (
        period.values("severity").annotate(count=Count("id")).order_by("-count")
    )
    by_severity = [
        {"severity": row["severity"], "count": row["count"]}
        for row in by_severity_rows
    ]

    day_rows = (
        period.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    by_day = [
        {
            "label": row["day"].isoformat() if row["day"] else "",
            "count": row["count"],
        }
        for row in day_rows
    ]

    return {
        "queue": {
            "open": open_qs.count(),
            "acknowledged": live.filter(status=Alert.Status.ACKNOWLEDGED).count(),
            "escalated": live.filter(status=Alert.Status.ESCALATED).count(),
            "critical_open": open_qs.filter(
                severity=Alert.Severity.CRITICAL
            ).count(),
            "active": live.filter(status__in=OPENISH).count(),
        },
        "period": {
            "opened": period.count(),
            "resolved": period.filter(status=Alert.Status.RESOLVED).count(),
            "by_severity": by_severity,
            "by_day": by_day,
        },
        "totals": {
            "all": period.count(),
            "resolved": live.filter(status=Alert.Status.RESOLVED).count(),
        },
    }
