"""Notification write path — create inside business transactions."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from notifications.models import Notification


class NotificationService:
    @staticmethod
    @transaction.atomic
    def notify(
        *,
        user,
        title: str,
        body: str = "",
        source: str = "System",
        severity: str = Notification.Severity.INFO,
        channel: str = Notification.Channel.IN_APP,
        template_code: str = "",
        link_path: str = "",
        params: dict | None = None,
        dedupe_key: str = "",
    ) -> Notification:
        """
        Create an inbox/outbox row. Concurrent dedupe races are absorbed via
        UniqueConstraint + IntegrityError → re-fetch (no forked duplicates).
        """
        if dedupe_key:
            existing = (
                Notification.objects.select_for_update()
                .filter(user=user, dedupe_key=dedupe_key)
                .first()
            )
            if existing:
                return existing

        try:
            with transaction.atomic():
                return Notification.objects.create(
                    user=user,
                    title=title,
                    body=body,
                    source=source,
                    severity=severity,
                    channel=channel,
                    template_code=template_code,
                    link_path=link_path,
                    params=params or {},
                    dedupe_key=dedupe_key or "",
                    status=Notification.Status.SENT
                    if channel == Notification.Channel.IN_APP
                    else Notification.Status.QUEUED,
                )
        except IntegrityError:
            if not dedupe_key:
                raise
            return Notification.objects.get(user=user, dedupe_key=dedupe_key)

    @staticmethod
    @transaction.atomic
    def mark_read(*, notification: Notification, user) -> Notification:
        if notification.user_id != user.id:
            from core.exceptions import DomainError

            raise DomainError("FORBIDDEN", "Not your notification.", http=403)
        locked = (
            Notification.objects.select_for_update()
            .filter(pk=notification.pk)
            .first()
        )
        if locked is None:
            from core.exceptions import DomainError

            raise DomainError("NOT_FOUND", "Notification not found.", http=404)
        if locked.read_at is None:
            locked.read_at = timezone.now()
            locked.save(update_fields=["read_at", "updated_at"])
        return locked

    @staticmethod
    def mark_all_read(*, user) -> int:
        return Notification.objects.filter(user=user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
