"""Support tickets — ops help desk (not fraud risk)."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from accounts.models import Account, Driver
from core.models import BaseModel


class SupportCase(BaseModel):
    class Kind(models.TextChoices):
        GENERAL = "GENERAL", "General"
        PAYMENT_DISPUTE = "PAYMENT_DISPUTE", "Payment dispute"
        IDENTITY = "IDENTITY", "Identity / KYC"
        ENGINE_RELEASE = "ENGINE_RELEASE", "Engine release"
        RISK_REFERRAL = "RISK_REFERRAL", "Referred from risk"
        OTHER = "OTHER", "Other"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PENDING = "PENDING", "Pending"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    code = models.CharField(max_length=24, unique=True, db_index=True)
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="support_cases"
    )
    driver = models.ForeignKey(
        Driver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_cases",
    )
    kind = models.CharField(max_length=30, choices=Kind.choices, default=Kind.GENERAL)
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.NORMAL, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    subject = models.CharField(max_length=200)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_cases",
    )
    sla_due_at = models.DateTimeField(null=True, blank=True)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opened_support_cases",
    )
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_cases",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account", "-created_at"]),
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["payment"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} [{self.status}]"


class CaseEvent(BaseModel):
    class Kind(models.TextChoices):
        NOTE = "NOTE", "Note"
        STATUS = "STATUS", "Status change"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"
        ATTACHMENT = "ATTACHMENT", "Attachment"

    case = models.ForeignKey(
        SupportCase, on_delete=models.CASCADE, related_name="events"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_case_events",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.NOTE)
    body = models.TextField(blank=True, default="")
    attachment = models.ForeignKey(
        "core.MediaAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_case_events",
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.case_id} · {self.kind}"
