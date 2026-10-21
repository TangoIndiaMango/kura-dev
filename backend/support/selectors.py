"""Aggregate stats for admin Support Cases KPIs / charts."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from django.db.models import Count, QuerySet
from django.utils import timezone
from django.utils.dateparse import parse_date

from accounts.permissions import user_has_capability
from accounts.selectors.scope import account_ids_touching_hubs, hub_ids_for
from support.models import SupportCase


def _own_account_ids(user) -> list:
    ids: list = []
    driver = getattr(user, "driver_profile", None)
    if driver is not None:
        ids.append(driver.account_id)
    ids.extend(user.accounts.values_list("id", flat=True))
    return list({i for i in ids if i})


def cases_for(user) -> QuerySet[SupportCase]:
    qs = SupportCase.objects.select_related(
        "account", "assigned_to", "opened_by", "driver", "payment"
    ).prefetch_related("events__attachment", "events__actor")
    if user_has_capability(user, "cases:read"):
        return qs
    scope = hub_ids_for(user)
    if scope is not None:
        if not scope:
            return qs.none()
        return qs.filter(account_id__in=account_ids_touching_hubs(scope))
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)

ACTIVE = (SupportCase.Status.OPEN, SupportCase.Status.PENDING)
CLOSED = (SupportCase.Status.RESOLVED, SupportCase.Status.CLOSED)
HIGH = (SupportCase.Priority.HIGH, SupportCase.Priority.URGENT)

# Design console shows ~8h SLA on high disputes; map by priority.
SLA_HOURS = {
    SupportCase.Priority.URGENT: 4,
    SupportCase.Priority.HIGH: 8,
    SupportCase.Priority.NORMAL: 48,
    SupportCase.Priority.LOW: 72,
}


def sla_due_for(priority: str, *, from_dt=None):
    hours = SLA_HOURS.get(priority, 48)
    base = from_dt or timezone.now()
    return base + timedelta(hours=hours)


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


def case_stats(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Live queue + period opened volume (date range on created_at)."""
    now = timezone.now()
    risk_cut = now + timedelta(hours=2)

    live = SupportCase.objects.all()
    active = live.filter(status__in=ACTIVE)
    period = _apply_created_range(live, start_date, end_date)

    by_kind_rows = (
        period.values("kind").annotate(count=Count("id")).order_by("-count")
    )
    by_kind = [
        {"kind": row["kind"], "count": row["count"]} for row in by_kind_rows
    ]

    return {
        "queue": {
            "open": active.filter(status=SupportCase.Status.OPEN).count(),
            "pending": active.filter(status=SupportCase.Status.PENDING).count(),
            "unassigned": active.filter(assigned_to__isnull=True).count(),
            "high_priority": active.filter(priority__in=HIGH).count(),
            "sla_at_risk": active.filter(
                sla_due_at__isnull=False,
                sla_due_at__gt=now,
                sla_due_at__lte=risk_cut,
            ).count(),
            "sla_breached": active.filter(
                sla_due_at__isnull=False, sla_due_at__lt=now
            ).count(),
            "disputes": active.filter(
                kind=SupportCase.Kind.PAYMENT_DISPUTE
            ).count(),
        },
        "period": {
            "opened": period.count(),
            "resolved": period.filter(status__in=CLOSED).count(),
            "by_kind": by_kind,
        },
        "totals": {
            "all": period.count(),
            "active": active.count(),
            "closed": live.filter(status__in=CLOSED).count(),
        },
    }
