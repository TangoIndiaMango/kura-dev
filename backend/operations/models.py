from django.db import models
from django.conf import settings

from core.models import BaseModel
from accounts.models import User
from mobility.models import Hub, Swap


class Shift(BaseModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Active Shift"
        CLOSED = "CLOSED", "Closed"

    agent = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="agent_shifts"
    )
    hub = models.ForeignKey(
        Hub, on_delete=models.CASCADE, related_name="hub_shifts"
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash_kobo = models.BigIntegerField(default=1_000_000)
    closing_cash_kobo = models.BigIntegerField(null=True, blank=True)
    expected_cash_kobo = models.BigIntegerField(null=True, blank=True)
    variance_kobo = models.BigIntegerField(null=True, blank=True)
    lodge_ref = models.CharField(max_length=100, blank=True, default="")
    lodged_amount_kobo = models.BigIntegerField(null=True, blank=True)
    lodged_at = models.DateTimeField(null=True, blank=True)
    # Closed by the nightly sweep: expected cash is recorded, the physical count
    # (closing_cash_kobo) is still owed — ops record it via close.
    auto_closed = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )

    def __str__(self):
        return f"Shift by {self.agent.first_name} at {self.hub.code} ({self.status})"


class Override(BaseModel):
    class Reason(models.TextChoices):
        SYSTEM_DOWN = "SYSTEM_DOWN", "System / Network Offline"
        BALANCE_DISPUTE = "BALANCE_DISPUTE", "Payment/Balance Dispute"
        DISCRETION = "DISCRETION", "Supervisor Discretion"
        BAY_TRIAGE = "BAY_TRIAGE", "Bay triage override"
        FACE_EXCEPTION = "FACE_EXCEPTION", "Face match exception"
        KYC_PENDING = "KYC_PENDING", "KYC pending exception"
        PAYMENT_EXCEPTION = "PAYMENT_EXCEPTION", "Payment exception"

    swap = models.OneToOneField(
        Swap,
        on_delete=models.CASCADE,
        related_name="override_info",
        null=True,
        blank=True,
    )
    agent = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="agent_overrides"
    )
    reason = models.CharField(
        max_length=50, choices=Reason.choices, default=Reason.DISCRETION
    )
    note = models.TextField()

    def __str__(self):
        return f"Override for Swap {self.swap_id} by {self.agent.email}: {self.reason}"


class Alert(BaseModel):
    class Kind(models.TextChoices):
        BATTERY_MISMATCH = "BATTERY_MISMATCH", "Battery Serial Mismatch"
        LOW_INVENTORY = "LOW_INVENTORY", "Low Ready Batteries"
        SOLAR_FAULT = "SOLAR_FAULT", "Solar / Grid Power Issue"
        CASH_LIMIT = "CASH_LIMIT", "Agent Cash Limit Reached"
        HUB_OFFLINE = "HUB_OFFLINE", "Hub Offline"
        PAYMENT_FAILURE = "PAYMENT_FAILURE", "Payment Failure"
        SHIFT_CASH_VARIANCE = "SHIFT_CASH_VARIANCE", "Shift Drawer Cash Variance"
        SETTLEMENT_MISMATCH = "SETTLEMENT_MISMATCH", "Cash Settlement Mismatch"
        AGENT_OVERRIDE_LIMIT = "AGENT_OVERRIDE_LIMIT", "Agent Override Daily Limit"
        OTHER = "OTHER", "Other"

    class Severity(models.TextChoices):
        INFO = "INFO", "Information"
        WARNING = "WARNING", "Warning"
        CRITICAL = "CRITICAL", "Critical Alert"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
        RESOLVED = "RESOLVED", "Resolved"
        ESCALATED = "ESCALATED", "Escalated"

    hub = models.ForeignKey(
        Hub,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="hub_alerts",
    )
    kind = models.CharField(max_length=50, choices=Kind.choices)
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.WARNING
    )
    message = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    is_resolved = models.BooleanField(default=False, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_alerts",
    )
    resolve_note = models.TextField(blank=True, default="")
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_alerts",
    )
    delivery_channel = models.CharField(max_length=40, blank=True, default="IN_APP")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "severity", "-created_at"]),
            models.Index(fields=["hub", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.kind}: {self.message[:40]}"


class AlertRule(BaseModel):
    """Persisted alert rule — evaluator can match against Alert.kind later."""

    class Severity(models.TextChoices):
        INFO = "INFO", "Information"
        WARNING = "WARNING", "Operational"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"

    name = models.CharField(max_length=120)
    kind = models.CharField(
        max_length=50, choices=Alert.Kind.choices, db_index=True
    )
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.WARNING
    )
    threshold = models.JSONField(default=dict, blank=True)
    channels = models.JSONField(default=list, blank=True)
    cooldown_minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alert_rules_created",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.kind})"


class InventoryCount(BaseModel):
    """End-of-day physical count vs system expected (PRD InventoryCount)."""

    hub = models.ForeignKey(
        Hub, on_delete=models.CASCADE, related_name="inventory_counts"
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_counts",
    )
    counted = models.JSONField(default=dict, blank=True)
    expected = models.JSONField(default=dict, blank=True)
    variance = models.JSONField(default=dict, blank=True)
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_counts_signed",
    )
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"InventoryCount {self.hub_id} @ {self.created_at}"


class CashDeposit(BaseModel):
    """Agent cash collected at hub (ledger-first; PSP agent ref optional)."""

    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiated"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cash_deposits",
    )
    hub = models.ForeignKey(Hub, on_delete=models.PROTECT, related_name="cash_deposits")
    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.PROTECT,
        related_name="cash_deposits",
    )
    amount_kobo = models.BigIntegerField()
    psp_agent_ref = models.CharField(max_length=120, blank=True, default="")
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="cash_deposits",
    )
    receipt_code = models.CharField(max_length=30, unique=True, db_index=True)
    shift = models.ForeignKey(
        Shift,
        on_delete=models.PROTECT,
        related_name="cash_deposits",
    )
    purpose = models.CharField(
        max_length=20,
        default="SWAP",
        db_index=True,
        help_text="SWAP = bay fee settle; FUND = wallet top-up via agent cash.",
    )
    idempotency_key = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUCCESS, db_index=True
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["shift", "status"]),
            models.Index(fields=["hub", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.receipt_code} {self.amount_kobo} ({self.status})"
