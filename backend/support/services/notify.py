"""IN_APP alerts for support case activity."""
from __future__ import annotations

from accounts.models import User
from notifications.models import Notification
from notifications.services import NotificationService


def notify_case_staff(*, case, title: str, body: str, dedupe_key: str) -> int:
    users: list[User] = []
    assignee = case.assigned_to
    if assignee is not None and getattr(assignee, "is_active", False):
        users = [assignee]
    else:
        users = list(
            User.objects.filter(is_active=True)
            .filter(role__in=[User.Role.SUPER_ADMIN, User.Role.OPS_MANAGER])[:25]
        )
    sent = 0
    for user in users:
        NotificationService.notify(
            user=user,
            title=title,
            body=body,
            source="Support",
            severity=Notification.Severity.INFO,
            channel=Notification.Channel.IN_APP,
            template_code="support.case.update",
            link_path=f"/cases/{case.id}",
            dedupe_key=f"{dedupe_key}:{user.id}",
        )
        sent += 1
    return sent


def notify_case_rider(*, case, title: str, body: str, dedupe_key: str) -> int:
    owner = getattr(case.account, "owner_user", None)
    if owner is None or not getattr(owner, "is_active", False):
        return 0
    NotificationService.notify(
        user=owner,
        title=title,
        body=body,
        source="Support",
        severity=Notification.Severity.INFO,
        channel=Notification.Channel.IN_APP,
        template_code="support.case.update",
        link_path=f"/account/cases/{case.id}",
        dedupe_key=f"{dedupe_key}:{owner.id}",
    )
    return 1
