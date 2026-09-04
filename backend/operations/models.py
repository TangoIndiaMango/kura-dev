from django.db import models
from core.models import BaseModel
from accounts.models import User
from mobility.models import Hub, Swap

class Shift(BaseModel):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Active Shift'
        CLOSED = 'CLOSED', 'Closed'

    agent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shifts')
    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, related_name='shifts')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash_kobo = models.BigIntegerField(default=1000000) # ₦10,000 float
    closing_cash_kobo = models.BigIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    def __str__(self):
        return f"Shift by {self.agent.first_name} at {self.hub.code} ({self.status})"

class Override(BaseModel):
    class Reason(models.TextChoices):
        SYSTEM_DOWN = 'SYSTEM_DOWN', 'System / Network Offline'
        BALANCE_DISPUTE = 'BALANCE_DISPUTE', 'Payment/Balance Dispute'
        DISCRETION = 'DISCRETION', 'Supervisor Discretion'

    swap = models.OneToOneField(Swap, on_delete=models.CASCADE, related_name='override_info')
    agent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recorded_overrides')
    reason = models.CharField(max_length=50, choices=Reason.choices, default=Reason.DISCRETION)
    note = models.TextField()

    def __str__(self):
        return f"Override for Swap {self.swap_id} by {self.agent.email}: {self.reason}"

class Alert(BaseModel):
    class Kind(models.TextChoices):
        BATTERY_MISMATCH = 'BATTERY_MISMATCH', 'Battery Serial Mismatch'
        LOW_INVENTORY = 'LOW_INVENTORY', 'Low Ready Batteries'
        SOLAR_FAULT = 'SOLAR_FAULT', 'Solar / Grid Power Issue'
        CASH_LIMIT = 'CASH_LIMIT', 'Agent Cash Limit Reached'

    class Severity(models.TextChoices):
        INFO = 'INFO', 'Information'
        WARNING = 'WARNING', 'Warning'
        CRITICAL = 'CRITICAL', 'Critical Alert'

    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')
    kind = models.CharField(max_length=50, choices=Kind.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.WARNING)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"[{self.severity}] {self.kind}: {self.message[:40]}"
