"""Soft vehicle↔driver assignment history — current assignee stays on Vehicle.assigned_driver."""
from __future__ import annotations

from django.db import models

from accounts.models import Driver
from core.models import BaseModel
from mobility.models.vehicles import Vehicle


class VehicleAssignment(BaseModel):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="assignments"
    )
    driver = models.ForeignKey(
        Driver, on_delete=models.CASCADE, related_name="vehicle_assignments"
    )
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-starts_at", "-id"]
        indexes = [
            models.Index(fields=["vehicle", "-starts_at"]),
            models.Index(fields=["driver", "-starts_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["vehicle"],
                condition=models.Q(ends_at__isnull=True),
                name="uniq_open_vehicle_assignment",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.vehicle_id} → {self.driver_id} @ {self.starts_at}"
