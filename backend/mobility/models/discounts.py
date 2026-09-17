"""Discount campaigns — server-owned promo rules (PRD pricing / volume discounts)."""
from __future__ import annotations

from django.db import models

from accounts.models import Account, User
from core.models import BaseModel



class DiscountCampaign(BaseModel):
    """Admin · Discounts. Redeemed only via DiscountService (never trust client due)."""

    class ValueType(models.TextChoices):
        PERCENT = "PERCENT", "Percent"
        AMOUNT = "AMOUNT", "Fixed amount (kobo)"

    class Audience(models.TextChoices):
        ALL = "ALL", "All operators"
        FLEET = "FLEET", "Fleet accounts"
        SEGMENT = "SEGMENT", "Segment grant"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending sign-off"
        SCHEDULED = "SCHEDULED", "Scheduled"
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        EXPIRED = "EXPIRED", "Expired"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    class Period(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        SWAP = "swap", "Pay-per-swap"

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=40, unique=True, db_index=True)
    value_type = models.CharField(max_length=10, choices=ValueType.choices)
    value = models.PositiveIntegerField(
        help_text="PERCENT: 1–100. AMOUNT: integer kobo off list price.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    applies_to_all_plans = models.BooleanField(default=True)
    plan_option_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="Client option ids: daily|weekly|monthly|pps when not all plans.",
    )
    periods = models.JSONField(
        default=list,
        help_text="Eligible periods: daily|weekly|monthly|swap.",
    )
    audience = models.CharField(
        max_length=20, choices=Audience.choices, default=Audience.ALL
    )
    fleet_min_vehicles = models.PositiveIntegerField(null=True, blank=True)
    segment_id = models.CharField(max_length=64, blank=True, default="")
    channels = models.CharField(
        max_length=80,
        default="App · USSD · Hub",
        help_text="Display + allow-list, e.g. 'App · USSD'.",
    )
    summary = models.CharField(max_length=255, blank=True, default="")
    max_redemptions = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Null = unlimited global redemptions.",
    )
    redemptions_count = models.PositiveIntegerField(default=0)
    max_per_account = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discounts_created",
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discounts_approved",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "code"]),
        ]

    def __str__(self):
        return f"{self.code} [{self.status}]"


class DiscountRedemption(BaseModel):
    """Immutable redemption ledger — one row per successful apply on a payment."""

    discount = models.ForeignKey(
        DiscountCampaign, on_delete=models.PROTECT, related_name="redemptions"
    )
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="discount_redemptions"
    )
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discount_redemptions",
    )
    subscription = models.ForeignKey(
        "mobility.Subscription",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discount_redemptions",
    )
    list_price_kobo = models.BigIntegerField()
    discount_kobo = models.BigIntegerField()
    due_kobo = models.BigIntegerField()
    channel = models.CharField(max_length=20, default="App")
    period = models.CharField(max_length=20, blank=True, default="")
    idempotency_key = models.CharField(
        max_length=64, unique=True, null=True, blank=True, db_index=True
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["discount", "account"]),
        ]

    def __str__(self):
        return f"Redeem {self.discount.code} → {self.discount_kobo}k"
