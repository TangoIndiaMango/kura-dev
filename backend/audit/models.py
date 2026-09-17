"""Append-only audit events — portable across projects."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import BaseModel


class AuditEvent(BaseModel):
    """
    Cross-cutting audit row. Prefer writing only via AuditService.record().
    DB should ideally be INSERT-only for the app role in production.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    actor_email = models.CharField(max_length=255, blank=True, default="")
    actor_role = models.CharField(max_length=50, blank=True, default="")
    action = models.CharField(max_length=100, db_index=True)
    subject_type = models.CharField(max_length=100, db_index=True)
    subject_id = models.CharField(max_length=100, db_index=True)
    subject_label = models.CharField(max_length=255, blank=True, default="")
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    request_id = models.CharField(max_length=64, blank=True, default="")
    prev_hash = models.CharField(max_length=64, blank=True, default="")
    row_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["subject_type", "subject_id", "-created_at"]),
            models.Index(fields=["actor", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.subject_type}:{self.subject_id}"
