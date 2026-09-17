from django.db import models

from accounts.models.account import Account
from core.models import BaseModel


class IdentityDocument(BaseModel):
    class DocType(models.TextChoices):
        NIN = "NIN", "NIN"
        BVN = "BVN", "BVN"
        VOTER = "VOTER", "Voter ID"
        DRIVERS_LICENCE = "DRIVERS_LICENCE", "Driver's licence"
        PASSPORT = "PASSPORT", "Passport"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    class VerifiedVia(models.TextChoices):
        PSP = "PSP", "PSP"
        PROVIDER = "PROVIDER", "Provider"
        MANUAL = "MANUAL", "Manual"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="identity_documents")
    doc_type = models.CharField(max_length=30, choices=DocType.choices)
    number_encrypted = models.TextField(blank=True, default="")
    number_last4 = models.CharField(max_length=4, blank=True, default="")
    front_image = models.ForeignKey(
        "core.MediaAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="identity_fronts",
    )
    back_image = models.ForeignKey(
        "core.MediaAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="identity_backs",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verified_via = models.CharField(
        max_length=20, choices=VerifiedVia.choices, blank=True, default=""
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.CharField(max_length=255, blank=True, default="")
    photos_requested = models.BooleanField(default=False)
    request_note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account", "doc_type", "status"]),
        ]

    def __str__(self):
        return f"{self.doc_type} ••••{self.number_last4} ({self.account.kura_id})"
