from django.db import models

from accounts.models import Account, Driver, User
from core.models import BaseModel

from mobility.models.batteries import Battery
from mobility.models.hubs import Hub
from mobility.models.plans import Subscription
from mobility.models.vehicles import Vehicle

class Reservation(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Confirmation'
        CONFIRMED = 'CONFIRMED', 'Confirmed & Reserved'
        USED = 'USED', 'Completed'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentMode(models.TextChoices):
        PLAN = 'PLAN', 'Subscription Plan'
        WALLET = 'WALLET', 'Wallet Deduction'
        CREDIT = 'CREDIT', 'Swap Credit'
        CASH = 'CASH', 'Cash at Hub'

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='reservations')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='reservations')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='reservations')
    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, related_name='reservations')
    battery = models.ForeignKey(Battery, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    code = models.CharField(max_length=20, unique=True, db_index=True) # KB-8924
    token_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    token_ciphertext = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices, default=PaymentMode.WALLET)
    hold_amount_kobo = models.BigIntegerField(default=0)
    expires_at = models.DateTimeField()

    class Source(models.TextChoices):
        APP = "APP", "App"
        USSD = "USSD", "USSD"
        HUB_APP = "HUB_APP", "Hub app"
        HUB_OFFLINE = "HUB_OFFLINE", "Hub offline"
        SYSTEM = "SYSTEM", "System"

    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.APP,
        db_index=True,
    )

    def __str__(self):
        return f"Reservation {self.code} at {self.hub.name} ({self.status})"

class Swap(BaseModel):
    class Status(models.TextChoices):
        STARTED = "STARTED", "Started"
        RETURN_RECORDED = "RETURN_RECORDED", "Return recorded"
        ISSUED = "ISSUED", "Issued"
        COMPLETED = "COMPLETED", "Completed"
        REVERSED = "REVERSED", "Reversed"
        FAILED = "FAILED", "Failed"

    class MismatchReason(models.TextChoices):
        OTHER_HUB_ISSUED = "OTHER_HUB_ISSUED", "Issued at another hub"
        REPLACED_BY_OPS = "REPLACED_BY_OPS", "Replaced by ops"
        UNKNOWN = "UNKNOWN", "Unknown"

    reservation = models.OneToOneField(Reservation, on_delete=models.SET_NULL, null=True, blank=True, related_name='swap')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='swaps')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='swaps')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='swaps')
    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, related_name='swaps')
    agent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_swaps')

    returned_battery = models.ForeignKey(
        Battery,
        on_delete=models.PROTECT,
        related_name="swaps_returned",
        null=True,
        blank=True,
    )
    returned_charge_pct = models.PositiveIntegerField(default=15)

    issued_battery = models.ForeignKey(
        Battery,
        on_delete=models.PROTECT,
        related_name="swaps_issued",
        null=True,
        blank=True,
    )
    issued_charge_pct = models.PositiveIntegerField(default=100)

    payment_mode = models.CharField(max_length=20, choices=Reservation.PaymentMode.choices, default=Reservation.PaymentMode.WALLET)
    amount_kobo = models.BigIntegerField(default=150000) # ₦1,500.00
    vat_kobo = models.BigIntegerField(default=10465) # 7.5% split
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="swaps",
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="swaps",
    )

    class Source(models.TextChoices):
        APP = "APP", "App"
        USSD = "USSD", "USSD"
        HUB_APP = "HUB_APP", "Hub app"
        HUB_OFFLINE = "HUB_OFFLINE", "Hub offline"
        SYSTEM = "SYSTEM", "System"

    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.HUB_APP,
        db_index=True,
    )

    mismatch_flag = models.BooleanField(
        default=False,
        help_text="True if the returned battery did NOT match the battery last issued to this vehicle."
    )
    mismatch_reason = models.CharField(
        max_length=40,
        blank=True,
        default="",
        choices=MismatchReason.choices,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.STARTED, db_index=True
    )
    client_event_id = models.CharField(max_length=100, blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["account", "-created_at"]),
            models.Index(fields=["hub", "-created_at"]),
            models.Index(fields=["agent", "-created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["client_event_id"],
                condition=~models.Q(client_event_id=""),
                name="uniq_swap_client_event_id_nonzero",
            ),
        ]

    def __str__(self):
        mismatch_str = " [MISMATCH]" if self.mismatch_flag else ""
        return f"Swap #{self.id.hex[:8]} - {self.vehicle.registration_plate} at {self.hub.code}{mismatch_str}"

