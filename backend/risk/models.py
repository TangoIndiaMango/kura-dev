"""Fraud / compliance risk — separate from support tickets."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from accounts.models import Account
from core.models import BaseModel


class RiskRule(BaseModel):
    class Action(models.TextChoices):
        FLAG = "FLAG", "Flag for review"
        STEP_UP = "STEP_UP", "Step-up auth"
        BLOCK = "BLOCK", "Block action"
        FREEZE = "FREEZE", "Freeze wallet-out"
        RESTRICT = "RESTRICT", "Restrict account"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    code = models.CharField(max_length=60, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.MEDIUM
    )
    params = models.JSONField(default=dict, blank=True)
    action = models.CharField(
        max_length=20, choices=Action.choices, default=Action.FLAG
    )
    enabled = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return self.code


class RiskEvent(BaseModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        REVIEWED_OK = "REVIEWED_OK", "Reviewed OK"
        REVIEWED_FRAUD = "REVIEWED_FRAUD", "Reviewed fraud"
        ESCALATED = "ESCALATED", "Escalated"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    rule = models.ForeignKey(
        RiskRule, on_delete=models.PROTECT, related_name="events"
    )
    # Denormalized for CRM ?account= composition (PRD subject_* still stored).
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="risk_events",
    )
    subject_type = models.CharField(max_length=40, db_index=True)
    subject_id = models.CharField(max_length=64, db_index=True)
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.MEDIUM, db_index=True
    )
    score = models.PositiveIntegerField(default=0)
    context = models.JSONField(default=dict, blank=True)
    action_taken = models.CharField(max_length=40, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_risk_events",
    )
    review_note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account", "-created_at"]),
            models.Index(fields=["subject_type", "subject_id", "-created_at"]),
            models.Index(fields=["status", "severity"]),
        ]

    def __str__(self) -> str:
        return f"{self.rule_id} · {self.subject_type}:{self.subject_id}"


class RiskVelocityGrant(BaseModel):
    """Time-bound ops exception so bay can proceed after SWAP_VELOCITY block."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        CONSUMED = "CONSUMED", "Consumed"
        EXPIRED = "EXPIRED", "Expired"
        REVOKED = "REVOKED", "Revoked"

    risk_event = models.ForeignKey(
        RiskEvent,
        on_delete=models.CASCADE,
        related_name="velocity_grants",
    )
    vehicle_id = models.UUIDField(db_index=True)
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="velocity_grants",
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="velocity_grants_issued",
    )
    expires_at = models.DateTimeField(db_index=True)
    max_uses = models.PositiveSmallIntegerField(default=1)
    uses_remaining = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["vehicle_id", "status", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"VelocityGrant vehicle={self.vehicle_id} ({self.status})"
