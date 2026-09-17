from __future__ import annotations

from datetime import timedelta

from django.db.models import QuerySet
from django.utils import timezone

from audit.access import scope_audit_qs
from audit.models import AuditEvent


def audit_events_qs() -> QuerySet[AuditEvent]:
    return AuditEvent.objects.select_related("actor").order_by("-created_at")


def audit_events_for(user) -> QuerySet[AuditEvent]:
    return scope_audit_qs(audit_events_qs(), user)


def audit_for_subject(
    *, subject_type: str, subject_id: str, user=None
) -> QuerySet[AuditEvent]:
    qs = audit_events_qs().filter(
        subject_type__iexact=subject_type,
        subject_id=str(subject_id),
    )
    if user is not None:
        qs = scope_audit_qs(qs, user)
    return qs


def audit_stats(*, user=None) -> dict:
    qs = audit_events_for(user) if user is not None else audit_events_qs()
    since = timezone.now() - timedelta(hours=24)
    return {
        "totals": {
            "all": qs.count(),
            "last_24h": qs.filter(created_at__gte=since).count(),
        }
    }
