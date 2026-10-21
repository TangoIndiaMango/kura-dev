"""Soft VCU / OEM command queue — device polls or OEM webhook completes later."""
from __future__ import annotations

from django.db import models

from accounts.models import User
from core.models import BaseModel
from mobility.models.vehicles import Vehicle


class VehicleCommand(BaseModel):
    """ExternalCommand-shaped soft control: queue then ack when telematics/VCU responds."""

    class Kind(models.TextChoices):
        ENABLE_DRIVING = "ENABLE_DRIVING", "Enable driving"
        DISABLE_DRIVING = "DISABLE_DRIVING", "Disable driving / immobilize"
        REQUEST_STATE = "REQUEST_STATE", "Request vehicle state"
        UNLOCK_BATTERY = "UNLOCK_BATTERY", "Unlock battery compartment"
        DRAW_ATTENTION = "DRAW_ATTENTION", "Horn / lights locate"

    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent to device"
        ACKED = "ACKED", "Acknowledged"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="commands"
    )
    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.QUEUED, db_index=True
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_commands",
    )
    note = models.CharField(max_length=255, blank=True, default="")
    error = models.CharField(max_length=255, blank=True, default="")
    acked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["vehicle", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.kind} → {self.vehicle_id} ({self.status})"
