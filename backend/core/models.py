from django.conf import settings
from django.db import models

from core.ids import uuid7


class BaseModel(models.Model):
    """
    Abstract base model that uses UUIDv7 for time-ordered primary keys,
    with auto-managed timestamps.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class MediaAsset(BaseModel):
    """
    Provider-neutral media row. Domain models FK here; delivery URLs are computed
    at read time so CDN hosts / transforms can change without rewriting rows.
    """

    class Provider(models.TextChoices):
        CLOUDINARY = "cloudinary", "Cloudinary"
        # Future: R2 = "r2", S3 = "s3", LOCAL = "local"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        AUTHENTICATED = "authenticated", "Authenticated"

    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        default=Provider.CLOUDINARY,
        db_index=True,
    )
    storage_key = models.CharField(max_length=512, db_index=True)
    kind = models.CharField(max_length=40, blank=True, default="", db_index=True)
    content_type = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=20, default="image")
    byte_size = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True, default="")
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_media",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["provider", "storage_key"]),
            models.Index(fields=["uploaded_by", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "storage_key"],
                name="uniq_media_provider_storage_key",
            ),
        ]

    def __str__(self):
        return f"{self.provider}:{self.storage_key}"


class AuditEvent(BaseModel):
    """
    DEPRECATED — use `audit.models.AuditEvent` + `audit.services.AuditService`.
    Kept briefly for old migration history only; do not write new rows here.
    """

    actor_email = models.CharField(max_length=255, blank=True, default="")
    action = models.CharField(max_length=100)  # e.g. "swap.completed", "battery.assigned"
    target_model = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"[{self.created_at}] {self.actor_email}: {self.action} "
            f"on {self.target_model}:{self.target_id}"
        )


class QueuedTask(BaseModel):
    """Durable task queue row for DatabaseBackend (beyond ImmediateBackend)."""

    class Status(models.TextChoices):
        READY = "READY", "Ready"
        RUNNING = "RUNNING", "Running"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"

    result_id = models.CharField(max_length=64, unique=True, db_index=True)
    task_path = models.CharField(max_length=255, db_index=True)
    args = models.JSONField(default=list, blank=True)
    kwargs = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.READY, db_index=True
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    error = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.task_path} [{self.status}]"


class ConfigVersion(BaseModel):
    """Propose → approve (maker-checker). One ACTIVE tip per (namespace, key)."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACTIVE = "ACTIVE", "Active"
        SUPERSEDED = "SUPERSEDED", "Superseded"
        REJECTED = "REJECTED", "Rejected"

    namespace = models.CharField(max_length=40, db_index=True)
    key = models.CharField(max_length=80, db_index=True)
    value = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    effective_from = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="config_versions_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="config_versions_approved",
    )
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["namespace", "key", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.namespace}.{self.key} [{self.status}]"
