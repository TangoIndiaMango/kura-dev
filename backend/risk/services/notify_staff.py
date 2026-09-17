"""Notify staff who can review risk (IN_APP)."""
from __future__ import annotations

from accounts.models import User
from notifications.models import Notification
from notifications.services import NotificationService


def notify_risk_reviewers(
    *,
    title: str,
    body: str,
    link_path: str,
    dedupe_key: str,
    severity: str = Notification.Severity.WARNING,
) -> int:
    reviewers = (
        User.objects.filter(is_active=True)
        .filter(
            role__in=[User.Role.SUPER_ADMIN, User.Role.OPS_MANAGER],
        )[:25]
    )
    sent = 0
    for user in reviewers:
        NotificationService.notify(
            user=user,
            title=title,
            body=body,
            source="Risk",
            severity=severity,
            channel=Notification.Channel.IN_APP,
            template_code="risk.event.opened",
            link_path=link_path,
            dedupe_key=f"{dedupe_key}:{user.id}",
        )
        sent += 1
    return sent
