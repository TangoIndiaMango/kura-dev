"""NDPA consent ledger — one row per grant; withdrawal stamps the active row."""
from django.db import models

from accounts.models.account import Account
from core.models import BaseModel


class Consent(BaseModel):
    class Purpose(models.TextChoices):
        # SERVICE is required to use Kura and cannot be withdrawn (spec E1.11).
        SERVICE = "SERVICE", "Service terms"
        # Optional; withdrawn ⇒ excluded from financier/government exports (F11).
        DATA_SHARING = "DATA_SHARING", "Data sharing"

    class Channel(models.TextChoices):
        WEB = "WEB", "Web"
        APP = "APP", "App"
        USSD = "USSD", "USSD"
        HUB = "HUB", "Hub"

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="consents"
    )
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    granted_at = models.DateTimeField()
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    channel = models.CharField(
        max_length=10, choices=Channel.choices, default=Channel.WEB
    )
    policy_version = models.CharField(max_length=20)

    class Meta:
        ordering = ["-granted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["account", "purpose"],
                condition=models.Q(withdrawn_at__isnull=True),
                name="uniq_active_consent_per_purpose",
            ),
        ]
        indexes = [
            models.Index(fields=["purpose", "withdrawn_at"]),
        ]

    @property
    def is_active(self) -> bool:
        return self.withdrawn_at is None

    def __str__(self) -> str:
        state = "active" if self.is_active else "withdrawn"
        return f"{self.purpose} v{self.policy_version} ({state}) · {self.account.kura_id}"
