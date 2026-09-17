from django.db import models

from accounts.models.cooperative import Cooperative
from accounts.models.user import User
from core.ids import kura_id
from core.models import BaseModel


class Account(BaseModel):
    class Kind(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual Rider"
        FLEET = "FLEET", "Commercial Fleet"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        PENDING = "PENDING", "Pending Verification"
        DEREGISTERED = "DEREGISTERED", "Deregistered"

    class KycStatus(models.TextChoices):
        NONE = "NONE", "None"
        PROVISIONAL = "PROVISIONAL", "Provisional"
        PENDING = "PENDING", "Pending"
        PENDING_PSP = "PENDING_PSP", "Pending PSP"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    class RegistrationChannel(models.TextChoices):
        WEB = "WEB", "Web"
        APP = "APP", "App"
        USSD = "USSD", "USSD"
        HUB = "HUB", "Hub"

    class Psp(models.TextChoices):
        PAYSTACK = "PAYSTACK", "Paystack"
        NOMBA = "NOMBA", "Nomba"

    kura_id = models.CharField(max_length=30, unique=True, db_index=True)
    owner_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accounts")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.INDIVIDUAL)
    display_name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    kyc_status = models.CharField(
        max_length=20, choices=KycStatus.choices, default=KycStatus.NONE
    )
    registration_channel = models.CharField(
        max_length=10,
        choices=RegistrationChannel.choices,
        default=RegistrationChannel.WEB,
        db_index=True,
    )
    psp = models.CharField(
        max_length=20,
        choices=Psp.choices,
        blank=True,
        default="",
        db_index=True,
        help_text="PSP for this operator's NUBAN/funding. Empty ⇒ settings.DEFAULT_PSP.",
    )
    cooperative = models.ForeignKey(
        Cooperative,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="accounts",
    )

    class RiskStatus(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        WATCH = "WATCH", "Watch"
        RESTRICTED = "RESTRICTED", "Restricted"
        FROZEN = "FROZEN", "Frozen"

    risk_status = models.CharField(
        max_length=20,
        choices=RiskStatus.choices,
        default=RiskStatus.NORMAL,
        db_index=True,
    )

    def save(self, *args, **kwargs):
        # Human KR-* code; uniqueness enforced by DB (no check-then-insert).
        if not self.kura_id:
            self.kura_id = kura_id("KR", 6)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.kura_id} - {self.display_name}"
