"""Impact rollups + optional CMS stories / PDF jobs (PRD View C)."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from accounts.models import Account
from core.models import BaseModel
from mobility.models.hubs import Hub


class DailyHubMetric(BaseModel):
    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, related_name="daily_metrics")
    date = models.DateField(db_index=True)
    swaps = models.PositiveIntegerField(default=0)
    revenue_kobo_by_channel = models.JSONField(
        default=dict,
        blank=True,
        help_text='e.g. {"WALLET": 120000, "CASH": 50000}',
    )
    batteries_ready_avg = models.DecimalField(
        max_digits=8, decimal_places=2, default=0
    )
    no_shows = models.PositiveIntegerField(default=0)
    overrides = models.PositiveIntegerField(default=0)
    inputs = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["hub", "date"],
                name="uniq_daily_hub_metric",
            )
        ]

    def __str__(self) -> str:
        return f"{self.hub_id} {self.date}"


class DailyAccountMetric(BaseModel):
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="daily_impact_metrics"
    )
    date = models.DateField(db_index=True)
    swaps_completed = models.PositiveIntegerField(default=0)
    fuel_savings_kobo = models.BigIntegerField(default=0)
    co2_kg_est = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    petrol_litres_avoided_est = models.DecimalField(
        max_digits=12, decimal_places=3, default=0
    )
    inputs = models.JSONField(
        default=dict,
        blank=True,
        help_text="Factors used (₦/L, kWh↔L, gCO₂/L) so reports stay auditable.",
    )

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["account", "date"],
                name="uniq_daily_account_metric",
            )
        ]
        indexes = [
            models.Index(fields=["date"]),
        ]

    def __str__(self) -> str:
        return f"{self.account_id} {self.date}"


class MonthlyImpactMetric(BaseModel):
    period = models.CharField(
        max_length=7,
        unique=True,
        db_index=True,
        help_text="YYYY-MM",
    )
    operators_served = models.PositiveIntegerField(default=0)
    swaps = models.PositiveIntegerField(default=0)
    fuel_savings_kobo = models.BigIntegerField(default=0)
    engines_replaced = models.PositiveIntegerField(default=0)
    co2_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    inputs = models.JSONField(
        default=dict,
        blank=True,
        help_text="Rollup factors + source job metadata.",
    )

    class Meta:
        ordering = ["-period"]

    def __str__(self) -> str:
        return f"Impact {self.period}"


class ImpactStory(BaseModel):
    """Ops-editable narrative cards for Government Impact view."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        ARCHIVED = "ARCHIVED", "Archived"

    title = models.CharField(max_length=160)
    region = models.CharField(max_length=80, blank=True, default="")
    metric_highlight = models.CharField(max_length=120, blank=True, default="")
    partners = models.CharField(max_length=200, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="impact_stories_created",
    )
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "impact stories"

    def __str__(self) -> str:
        return self.title


class ReportJob(BaseModel):
    class Kind(models.TextChoices):
        IMPACT_PDF = "IMPACT_PDF", "Impact PDF"
        OPS_CSV = "OPS_CSV", "Ops CSV"
        FLEET_CSV = "FLEET_CSV", "Fleet CSV"
        REVENUE_CSV = "REVENUE_CSV", "Revenue CSV"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        RUNNING = "RUNNING", "Running"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"
        EXPIRED = "EXPIRED", "Expired"

    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    params = models.JSONField(default=dict, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_jobs",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.QUEUED, db_index=True
    )
    file_public_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Storage key or Cloudinary public_id for the artefact.",
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    idempotency_key = models.CharField(
        max_length=64, blank=True, default="", db_index=True
    )
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.kind} [{self.status}]"
