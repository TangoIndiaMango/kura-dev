from django.db import models

from core.models import BaseModel

class Hub(BaseModel):
    class Status(models.TextChoices):
        ONLINE = "ONLINE", "Online & Operational"
        OFFLINE = "OFFLINE", "Offline"
        MAINTENANCE = "MAINTENANCE", "Under Maintenance"
        CLOSED = "CLOSED", "Closed"

    code = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)
    lat = models.FloatField(default=6.5173)
    lng = models.FloatField(default=3.3734)
    slot_count = models.PositiveIntegerField(default=16)
    solar_capacity_kw = models.DecimalField(
        max_digits=5, decimal_places=2, default=12.50
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ONLINE
    )
    last_sync_at = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default="Africa/Lagos")
    operating_hours = models.JSONField(
        default=dict,
        blank=True,
        help_text='e.g. {"mon":[["08:00","20:00"]], ...} empty = always open when ONLINE',
    )

    def __str__(self):
        return f"{self.name} [{self.code}]"

