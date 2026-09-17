from django.db import models

from core.models import BaseModel

from mobility.models.batteries import Battery
from mobility.models.hubs import Hub

class HubSlot(BaseModel):
    class State(models.TextChoices):
        EMPTY = 'EMPTY', 'Empty'
        CHARGING = 'CHARGING', 'Charging'
        READY = 'READY', 'Ready for Swap'
        FAULT = 'FAULT', 'Slot Fault'

    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, related_name='slots')
    slot_no = models.PositiveIntegerField()
    battery = models.OneToOneField(Battery, on_delete=models.SET_NULL, null=True, blank=True, related_name='current_slot')
    state = models.CharField(max_length=20, choices=State.choices, default=State.EMPTY)

    class Meta:
        unique_together = ('hub', 'slot_no')
        ordering = ['slot_no']

    def __str__(self):
        battery_str = self.battery.serial if self.battery else "Empty"
        return f"{self.hub.code} Slot #{self.slot_no} [{self.state}] - {battery_str}"

