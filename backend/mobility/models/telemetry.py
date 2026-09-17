"""Vehicle telemetry events (PRD 3.7). Month partitioning can follow as ops scale."""
from __future__ import annotations

from django.db import models

from core.models import BaseModel
from mobility.models.batteries import Battery
from mobility.models.vehicles import Vehicle


class TelemetryEvent(BaseModel):
    class Source(models.TextChoices):
        IOT = "iot", "IoT device"
        MANUAL = "manual", "Hub / manual entry"

    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="telemetry_events"
    )
    recorded_at = models.DateTimeField(db_index=True)
    battery_pct = models.PositiveSmallIntegerField(null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    speed_kmh = models.FloatField(null=True, blank=True)
    odometer_km = models.FloatField(null=True, blank=True)
    source = models.CharField(
        max_length=12, choices=Source.choices, default=Source.MANUAL, db_index=True
    )
    battery = models.ForeignKey(
        Battery,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="telemetry_events",
    )
    ingest_batch = models.CharField(max_length=64, blank=True, default="", db_index=True)
    raw = models.JSONField(
        default=dict,
        blank=True,
        help_text="OEM/provider payload or extra sensors without schema churn.",
    )

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["vehicle", "-recorded_at"]),
            models.Index(fields=["source", "-recorded_at"]),
        ]

    def __str__(self) -> str:
        return f"Telemetry {self.vehicle_id} @ {self.recorded_at}"
