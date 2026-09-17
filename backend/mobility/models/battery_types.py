from django.db import models

from accounts.models import User
from core.models import BaseModel

from mobility.models.choices import VehicleType

class BatteryType(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending approval"
        ACTIVE = "ACTIVE", "Active"
        DEACTIVATED = "DEACTIVATED", "Deactivated"

    class QrScheme(models.TextChoices):
        PRINTED = "PRINTED", "Printed serial only"
        SIGNED = "SIGNED", "HMAC signed QR (L1)"
        BMS_AUTH = "BMS_AUTH", "OEM BMS auth (deferred)"
        NFC_SUN = "NFC_SUN", "NFC SUN (deferred)"

    name = models.CharField(max_length=100)
    manufacturer = models.CharField(max_length=100, default="KURA Energy")
    capacity_kwh = models.DecimalField(max_digits=5, decimal_places=2, default=3.24)
    nominal_voltage = models.PositiveIntegerField(default=72)
    # Catalogue physics for Est. range until BMS sends range_km.
    usable_energy_wh = models.PositiveIntegerField(
        default=2900,
        help_text="Usable pack energy in Wh (≈ capacity_kwh × 1000 × DoD).",
    )
    wh_per_km = models.PositiveIntegerField(
        default=50,
        help_text="Average Wh per km for this pack/vehicle class.",
    )
    vehicle_type = models.CharField(
        max_length=20, choices=VehicleType.choices, default=VehicleType.MOTORCYCLE
    )
    qr_scheme = models.CharField(
        max_length=20, choices=QrScheme.choices, default=QrScheme.SIGNED
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battery_types_created",
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battery_types_approved",
    )

    def __str__(self):
        return f"{self.name} ({self.vehicle_type})"

