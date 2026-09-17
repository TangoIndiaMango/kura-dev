"""Append-only battery custody trail (PRD BatteryEvent / I1)."""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel
from mobility.models.batteries import Battery
from mobility.models.hubs import Hub
from mobility.models.swaps import Swap


class BatteryEvent(BaseModel):
    class Event(models.TextChoices):
        RECEIVED = "RECEIVED", "Received into fleet"
        SLOTTED = "SLOTTED", "Slotted at hub"
        CHARGE_STARTED = "CHARGE_STARTED", "Charge started"
        READY = "READY", "Ready for swap"
        RESERVED = "RESERVED", "Reserved"
        ISSUED = "ISSUED", "Issued to vehicle"
        RETURNED = "RETURNED", "Returned from vehicle"
        TRIAGED = "TRIAGED", "Triaged"
        TRANSFERRED = "TRANSFERRED", "Transferred"
        FAULT = "FAULT", "Faulted"
        LOST = "LOST", "Lost"
        FOUND = "FOUND", "Found"
        RETIRED = "RETIRED", "Retired"

    class Source(models.TextChoices):
        APP = "APP", "Admin / app"
        HUB_APP = "HUB_APP", "Hub agent app"
        HUB_OFFLINE = "HUB_OFFLINE", "Offline hub sync"
        USSD = "USSD", "USSD"
        SYSTEM = "SYSTEM", "System"

    battery = models.ForeignKey(
        Battery, on_delete=models.CASCADE, related_name="custody_events"
    )
    event = models.CharField(max_length=20, choices=Event.choices, db_index=True)
    from_custodian_type = models.CharField(max_length=20, blank=True, default="")
    from_custodian_id = models.UUIDField(null=True, blank=True)
    to_custodian_type = models.CharField(max_length=20, blank=True, default="")
    to_custodian_id = models.UUIDField(null=True, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battery_custody_events",
    )
    hub = models.ForeignKey(
        Hub,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battery_custody_events",
    )
    swap = models.ForeignKey(
        Swap,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battery_custody_events",
    )
    charge_pct = models.PositiveIntegerField(null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.APP
    )
    prev_hash = models.CharField(max_length=64, blank=True, default="")
    row_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]
        indexes = [
            models.Index(fields=["battery", "-occurred_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.battery_id} {self.event} @ {self.occurred_at}"
