from django.db import models
from django.utils import timezone

from accounts.models import Account, User
from core.models import BaseModel

from mobility.models.choices import VehicleType
from mobility.models.vehicles import Vehicle

class Plan(BaseModel):
    """Catalog definition (Admin · Pricing · Plans). List price may lag matrix until dual-control publishes."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        DEACTIVATED = "DEACTIVATED", "Deactivated"
        PENDING = "PENDING", "Pending sign-off"

    class Period(models.TextChoices):
        DAY = "day", "Day"
        WEEK = "week", "Week"
        MONTH = "month", "Month"
        SWAP = "swap", "Pay-per-swap"

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=50, default=VehicleType.MOTORCYCLE)
    period = models.CharField(max_length=10, choices=Period.choices, default=Period.DAY)
    duration_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Null for period=swap (PPS catalog row).",
    )
    swap_allowance = models.PositiveIntegerField(null=True, blank=True)  # null = unlimited
    price_kobo = models.BigIntegerField(
        default=0,
        help_text="Display/list price in kobo; live settle uses PriceMatrix for PPS.",
    )
    description = models.TextField(blank=True, default="")
    auto_renew_default = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class PriceMatrix(BaseModel):
    """Admin tariff row: Daily · Weekly · Monthly · Pay-per-swap for one vehicle type."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PENDING = "PENDING", "Pending sign-off"
        SCHEDULED = "SCHEDULED", "Scheduled"
        REJECTED = "REJECTED", "Rejected"
        APPROVED = "APPROVED", "Approved"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    vehicle_type = models.CharField(max_length=50, db_index=True)
    daily_kobo = models.BigIntegerField()
    weekly_kobo = models.BigIntegerField()
    monthly_kobo = models.BigIntegerField()
    pay_per_swap_kobo = models.BigIntegerField()
    effective_from = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_matrices_created",
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_matrices_approved",
    )

    class Meta:
        ordering = ["-effective_from", "-created_at"]
        verbose_name_plural = "price matrices"
        indexes = [
            models.Index(fields=["vehicle_type", "status", "effective_from"]),
        ]

    def __str__(self):
        return f"{self.vehicle_type} PPS={self.pay_per_swap_kobo} [{self.status}]"

class BayHoldPolicy(BaseModel):
    """Singleton bay reservation window (Admin · Pricing · Hold limits)."""

    default_hold_minutes = models.PositiveIntegerField(default=15)
    max_extend_minutes = models.PositiveIntegerField(default=15)

    class Meta:
        verbose_name_plural = "bay hold policies"

    def __str__(self):
        return (
            f"Hold {self.default_hold_minutes}m / extend max {self.max_extend_minutes}m"
        )

class Subscription(BaseModel):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pending payment"
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        LAPSED_TO_PPS = "LAPSED_TO_PPS", "Lapsed to pay-per-swap"
        CANCELLED = "CANCELLED", "Cancelled"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="subscriptions")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    queued_plan = models.ForeignKey(
        Plan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="queued_subscriptions",
        help_text="Next plan to apply when the current period ends. Empty = no change queued.",
    )
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField()
    swaps_used = models.PositiveIntegerField(default=0)
    swaps_allowance = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    auto_renew = models.BooleanField(default=True)
    list_price_kobo = models.BigIntegerField(default=0)
    discount_kobo = models.BigIntegerField(default=0)
    amount_kobo = models.BigIntegerField(default=0)
    discount_code = models.CharField(max_length=40, blank=True, default="")
    idempotency_key = models.CharField(
        max_length=64, unique=True, null=True, blank=True, db_index=True
    )

    class Meta:
        indexes = [
            models.Index(fields=["account", "status", "-ends_at"]),
            models.Index(fields=["vehicle", "status"]),
            models.Index(fields=["status", "ends_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["vehicle"],
                condition=models.Q(status="ACTIVE"),
                name="uniq_active_subscription_per_vehicle",
            ),
        ]

    def __str__(self):
        return f"Sub: {self.vehicle.registration_plate} - {self.plan.name} ({self.status})"

