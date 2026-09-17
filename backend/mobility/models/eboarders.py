"""Path B — electric outboard (e-boarder) fleet inventory."""
from __future__ import annotations

from django.db import models

from accounts.models import Account
from core.models import BaseModel
from mobility.models.battery_types import BatteryType
from mobility.models.hubs import Hub
from mobility.models.vehicles import Vehicle


class EBoarder(BaseModel):
    """
    Serialled electric outboard issued at Path B install.

    Powered by swappable hub batteries (battery_type), not a built-in pack.
    Specs mirror marine e-outboard practice: serial, kW rating, voltage,
    shaft, and petrol-HP equivalent for operator communication.
    """

    class Status(models.TextChoices):
        IN_STOCK = "IN_STOCK", "In stock"
        ISSUED = "ISSUED", "Issued to vehicle"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        RETIRED = "RETIRED", "Retired"

    class ShaftLength(models.TextChoices):
        SHORT = "SHORT", "Short"
        LONG = "LONG", "Long"
        UNKNOWN = "UNKNOWN", "Unknown"

    serial = models.CharField(max_length=64, unique=True, db_index=True)
    make = models.CharField(max_length=80, default="Asobo")
    model = models.CharField(max_length=80)
    rated_watts = models.PositiveIntegerField(
        help_text="Continuous rated power in watts (6000 = 6 kW).",
    )
    petrol_hp_equivalent = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Operator-facing petrol HP equivalent (e.g. '15').",
    )
    nominal_voltage_v = models.PositiveSmallIntegerField(
        default=48,
        help_text="Propulsion bus voltage the unit expects.",
    )
    battery_type = models.ForeignKey(
        BatteryType,
        on_delete=models.PROTECT,
        related_name="eboarders",
    )
    shaft_length = models.CharField(
        max_length=16,
        choices=ShaftLength.choices,
        default=ShaftLength.UNKNOWN,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_STOCK,
        db_index=True,
    )
    current_hub = models.ForeignKey(
        Hub,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stocked_eboarders",
    )
    vehicle = models.OneToOneField(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eboarder",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eboarders",
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "current_hub"]),
            models.Index(fields=["battery_type", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.serial} [{self.status}]"

    @property
    def rated_kw_display(self) -> str:
        w = self.rated_watts or 0
        if w % 1000 == 0:
            return f"{w // 1000}"
        return f"{w / 1000:.1f}".rstrip("0").rstrip(".")
