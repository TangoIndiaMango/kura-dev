from django.db import models

from core.models import BaseModel

from mobility.models.battery_types import BatteryType
from mobility.models.hubs import Hub

class Battery(BaseModel):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Ready & Available'
        RESERVED = 'RESERVED', 'Reserved'
        ISSUED = 'ISSUED', 'Issued to Vehicle'
        RETURNED = 'RETURNED', 'Returned Awaiting Slot'
        CHARGING = 'CHARGING', 'Charging in Slot'
        UNAVAILABLE = 'UNAVAILABLE', 'Unavailable'
        FAULTED = 'FAULTED', 'Faulted / Needs Inspection'
        LOST = 'LOST', 'Lost / Unaccounted'
        RETIRED = 'RETIRED', 'Retired'

    class Custodian(models.TextChoices):
        HUB_SLOT = 'HUB_SLOT', 'Hub slot'
        VEHICLE = 'VEHICLE', 'Vehicle'
        TRANSIT = 'TRANSIT', 'In transit'
        WORKSHOP = 'WORKSHOP', 'Workshop'
        NONE = 'NONE', 'Unassigned'

    class ChargeSource(models.TextChoices):
        MANUAL = 'MANUAL', 'Manual entry'
        BMS = 'BMS', 'Battery management system'
        TELEMETRY = 'TELEMETRY', 'IoT / telemetry ingest'

    serial = models.CharField(max_length=50, unique=True, db_index=True)
    battery_type = models.ForeignKey(BatteryType, on_delete=models.PROTECT, related_name='batteries')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    charge_pct = models.PositiveIntegerField(default=100)
    charge_source = models.CharField(
        max_length=20, choices=ChargeSource.choices, default=ChargeSource.MANUAL
    )
    charge_observed_at = models.DateTimeField(null=True, blank=True)
    health_pct = models.PositiveIntegerField(default=98)
    cycle_count = models.PositiveIntegerField(default=12)
    manufactured_at = models.DateField(null=True, blank=True)
    current_hub = models.ForeignKey(Hub, on_delete=models.SET_NULL, null=True, blank=True, related_name='stationed_batteries')
    qr_secret = models.CharField(max_length=64, blank=True, default='')
    custodian_type = models.CharField(
        max_length=20, choices=Custodian.choices, default=Custodian.NONE, db_index=True
    )
    custodian_id = models.UUIDField(null=True, blank=True, db_index=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    expected_return_by = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.serial} ({self.charge_pct}%, {self.status})"

