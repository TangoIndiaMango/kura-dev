from django.db import models

from accounts.models import Account
from core.models import BaseModel

from mobility.models.batteries import Battery
from mobility.models.battery_types import BatteryType
from mobility.models.choices import VehicleType


class VehicleModel(BaseModel):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=50, default=VehicleType.MOTORCYCLE)
    battery_type = models.ForeignKey(
        BatteryType, on_delete=models.PROTECT, related_name="compatible_models"
    )
    service_interval_km = models.PositiveIntegerField(null=True, blank=True)
    service_interval_days = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["make", "model"],
                name="uniq_vehicle_model_make_model",
            ),
        ]

    def __str__(self):
        return f"{self.make} {self.model} ({self.vehicle_type})"


class Vehicle(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PENDING = "PENDING", "Pending Inspection"
        SUSPENDED = "SUSPENDED", "Suspended"
        RETIRED = "RETIRED", "Retired"

    class AcquisitionPath(models.TextChoices):
        EV_FIRST = "EV_FIRST", "EV first"
        ENGINE_SWAP = "ENGINE_SWAP", "Engine surrender"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="vehicles")
    vehicle_model = models.ForeignKey(
        VehicleModel, on_delete=models.PROTECT, related_name="vehicles"
    )
    registration_plate = models.CharField(max_length=30, unique=True, db_index=True)
    assigned_driver = models.ForeignKey(
        "accounts.Driver",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_vehicles",
        help_text="Optional soft assignment. Null = any account driver may book.",
    )
    hardware_id = models.CharField(
        max_length=64, unique=True, null=True, blank=True, db_index=True
    )
    iot_api_key_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        help_text="SHA-256 hex of device API key (plaintext shown once on rotate).",
    )
    vin = models.CharField(max_length=32, blank=True, default="", db_index=True)
    current_battery = models.OneToOneField(
        Battery,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mounted_vehicle",
        help_text="The battery currently installed on this vehicle. Crucial for return-matching.",
    )
    acquisition_path = models.CharField(
        max_length=20,
        choices=AcquisitionPath.choices,
        default=AcquisitionPath.EV_FIRST,
        db_index=True,
    )
    petrol_engine = models.OneToOneField(
        "mobility.PetrolEngine",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    qr_secret = models.CharField(max_length=64, blank=True, default="")

    def __str__(self):
        return f"{self.registration_plate} ({self.vehicle_model.make} {self.vehicle_model.model})"
