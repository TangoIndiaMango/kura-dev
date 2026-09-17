from __future__ import annotations

from django.db.models import QuerySet
from django.utils import timezone
from datetime import timedelta

from notifications.models import Notification


def notifications_for(user) -> QuerySet[Notification]:
    """Inbox is IN_APP only — EMAIL/SMS rows are delivery outbox, not UI duplicates."""
    return Notification.objects.filter(
        user=user,
        channel=Notification.Channel.IN_APP,
    ).order_by("-created_at")


def notification_stats(user) -> dict:
    qs = notifications_for(user)
    since = timezone.now() - timedelta(days=7)
    return {
        "totals": {
            "all": qs.count(),
            "unread": qs.filter(read_at__isnull=True).count(),
            "last_7d": qs.filter(created_at__gte=since).count(),
        }
    }
