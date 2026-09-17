"""Aggregate stats for admin Risk Events KPIs / charts."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db.models import Count
from django.utils import timezone
from django.utils.dateparse import parse_date

from risk.models import RiskEvent

OPEN = RiskEvent.Status.OPEN
ESCALATED = RiskEvent.Status.ESCALATED
REVIEWED = (
    RiskEvent.Status.REVIEWED_OK,
    RiskEvent.Status.REVIEWED_FRAUD,
)
HIGH = (RiskEvent.Severity.HIGH, RiskEvent.Severity.CRITICAL)


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


def risk_event_stats(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Live open queue + period volume (date range on created_at)."""
    live = RiskEvent.objects.select_related("rule")
    open_qs = live.filter(status=OPEN)
    period = _apply_created_range(live, start_date, end_date)

    by_rule_rows = (
        period.values("rule__code")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_rule = [
        {"rule": row["rule__code"] or "UNKNOWN", "count": row["count"]}
        for row in by_rule_rows
    ]

    by_severity_rows = (
        open_qs.values("severity").annotate(count=Count("id")).order_by("-count")
    )
    by_severity = [
        {"severity": row["severity"], "count": row["count"]}
        for row in by_severity_rows
    ]

    return {
        "queue": {
            "open": open_qs.count(),
            "escalated": live.filter(status=ESCALATED).count(),
            "high_severity": open_qs.filter(severity__in=HIGH).count(),
            "critical": open_qs.filter(
                severity=RiskEvent.Severity.CRITICAL
            ).count(),
        },
        "period": {
            "opened": period.count(),
            "reviewed": period.filter(status__in=REVIEWED).count(),
            "by_rule": by_rule,
        },
        "totals": {
            "all": period.count(),
            "open": open_qs.count(),
            "reviewed": live.filter(status__in=REVIEWED).count(),
        },
        "by_severity": by_severity,
    }
