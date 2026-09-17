"""PWA browser trust rows — identifier only, not authentication."""
from django.db import models

from accounts.models.account import Account
from core.models import BaseModel


class TrustedDevice(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        REVOKED = "REVOKED", "Revoked"

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="trusted_devices"
    )
    device_key = models.CharField(max_length=64, db_index=True)
    label = models.CharField(max_length=80, blank=True, default="")
    user_agent = models.CharField(max_length=255, blank=True, default="")
    first_seen_at = models.DateTimeField()
    last_seen_at = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )

    class Meta:
        ordering = ["-last_seen_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["account", "device_key"],
                name="uniq_trusted_device_account_key",
            ),
        ]
        indexes = [
            models.Index(fields=["account", "status", "-first_seen_at"]),
        ]

    def __str__(self) -> str:
        return f"device {self.device_key[:8]}… ({self.account.kura_id})"
