"""In-app + outbox notifications — portable across projects."""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import BaseModel


class Notification(BaseModel):
    class Channel(models.TextChoices):
        IN_APP = "IN_APP", "In-app"
        EMAIL = "EMAIL", "Email"
        SMS = "SMS", "SMS"
        PUSH = "PUSH", "Push"

    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"
        DELIVERED = "DELIVERED", "Delivered"

    class Severity(models.TextChoices):
        INFO = "INFO", "Info"
        WARNING = "WARNING", "Warning"
        CRITICAL = "CRITICAL", "Critical"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.IN_APP,
        db_index=True,
    )
    template_code = models.CharField(max_length=80, blank=True, default="")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO,
        db_index=True,
    )
    source = models.CharField(max_length=80, blank=True, default="System", db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SENT,
        db_index=True,
    )
    params = models.JSONField(default=dict, blank=True)
    link_path = models.CharField(max_length=255, blank=True, default="")
    dedupe_key = models.CharField(max_length=120, blank=True, default="", db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    provider_ref = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "read_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "dedupe_key"],
                condition=~Q(dedupe_key=""),
                name="uniq_notification_user_dedupe",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} → {self.user_id}"
