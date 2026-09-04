import random
from django.db import models
from django.utils import timezone
from core.models import BaseModel
from accounts.models import Account, Driver, User

class VehicleType(models.TextChoices):
    MOTORCYCLE = 'MOTORCYCLE', 'Commercial Motorcycle (Okada)'
    TRICYCLE = 'TRICYCLE', 'Commercial Tricycle (Keke)'
    BOAT = 'BOAT', 'Passenger Canoe / Boat'

class BatteryType(BaseModel):
    name = models.CharField(max_length=100) # e.g. "Kura PowerCore 72V 45Ah"
    manufacturer = models.CharField(max_length=100, default='KURA Energy')
    capacity_kwh = models.DecimalField(max_digits=5, decimal_places=2, default=3.24)
    nominal_voltage = models.PositiveIntegerField(default=72)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.MOTORCYCLE)

    def __str__(self):
        return f"{self.name} ({self.vehicle_type})"

class Hub(BaseModel):
    class Status(models.TextChoices):
        ONLINE = 'ONLINE', 'Online & Operational'
        OFFLINE = 'OFFLINE', 'Offline'
        MAINTENANCE = 'MAINTENANCE', 'Under Maintenance'
        CLOSED = 'CLOSED', 'Closed'

    code = models.CharField(max_length=30, unique=True, db_index=True) # HUB-YBA-01
    name = models.CharField(max_length=150) # Yaba Central Hub
    address = models.CharField(max_length=255)
    lat = models.FloatField(default=6.5173)
    lng = models.FloatField(default=3.3734)
    slot_count = models.PositiveIntegerField(default=16)
    solar_capacity_kw = models.DecimalField(max_digits=5, decimal_places=2, default=12.50)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ONLINE)

    def __str__(self):
        return f"{self.name} [{self.code}]"

class Battery(BaseModel):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Ready & Available'
        RESERVED = 'RESERVED', 'Reserved'
        ISSUED = 'ISSUED', 'Issued to Vehicle'
        CHARGING = 'CHARGING', 'Charging in Slot'
        FAULTED = 'FAULTED', 'Faulted / Needs Inspection'
        RETIRED = 'RETIRED', 'Retired'

    serial = models.CharField(max_length=50, unique=True, db_index=True)
    battery_type = models.ForeignKey(BatteryType, on_delete=models.PROTECT, related_name='batteries')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    charge_pct = models.PositiveIntegerField(default=100)
    health_pct = models.PositiveIntegerField(default=98)
    cycle_count = models.PositiveIntegerField(default=12)
    current_hub = models.ForeignKey(Hub, on_delete=models.SET_NULL, null=True, blank=True, related_name='stationed_batteries')

    def __str__(self):
        return f"{self.serial} ({self.charge_pct}%, {self.status})"

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

class VehicleModel(BaseModel):
    make = models.CharField(max_length=100) # e.g. "Silversun", "Ampersand"
    model = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.MOTORCYCLE)
    battery_type = models.ForeignKey(BatteryType, on_delete=models.PROTECT, related_name='compatible_models')

    def __str__(self):
        return f"{self.make} {self.model} ({self.vehicle_type})"

class Vehicle(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PENDING = 'PENDING', 'Pending Inspection'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_model = models.ForeignKey(VehicleModel, on_delete=models.PROTECT, related_name='vehicles')
    registration_plate = models.CharField(max_length=30, unique=True, db_index=True)
    current_battery = models.OneToOneField(
        Battery,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mounted_vehicle',
        help_text="The battery currently installed on this vehicle. Crucial for return-matching."
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.registration_plate} ({self.vehicle_model.make} {self.vehicle_model.model})"

class Plan(BaseModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.MOTORCYCLE)
    duration_days = models.PositiveIntegerField(default=1) # 1, 7, 30 days
    swap_allowance = models.PositiveIntegerField(null=True, blank=True) # null = unlimited
    price_kobo = models.BigIntegerField(default=120000) # ₦1,200.00
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (₦{self.price_kobo / 100:,.2f})"

class Subscription(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='subscriptions')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='subscriptions')
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField()
    swaps_used = models.PositiveIntegerField(default=0)
    swaps_allowance = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    auto_renew = models.BooleanField(default=True)

    def __str__(self):
        return f"Sub: {self.vehicle.registration_plate} - {self.plan.name} ({self.status})"

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
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices, default=PaymentMode.WALLET)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.code:
            rand_code = ''.join(random.choices('0123456789', k=4))
            self.code = f"KB-{rand_code}"
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=20)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reservation {self.code} at {self.hub.name} ({self.status})"

class Swap(BaseModel):
    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        REVERSED = 'REVERSED', 'Reversed'
        FAILED = 'FAILED', 'Failed'

    reservation = models.OneToOneField(Reservation, on_delete=models.SET_NULL, null=True, blank=True, related_name='swap')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='swaps')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='swaps')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='swaps')
    hub = models.ForeignKey(Hub, on_delete=models.CASCADE, related_name='swaps')
    agent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_swaps')

    returned_battery = models.ForeignKey(Battery, on_delete=models.PROTECT, related_name='swaps_returned')
    returned_charge_pct = models.PositiveIntegerField(default=15)

    issued_battery = models.ForeignKey(Battery, on_delete=models.PROTECT, related_name='swaps_issued')
    issued_charge_pct = models.PositiveIntegerField(default=100)

    payment_mode = models.CharField(max_length=20, choices=Reservation.PaymentMode.choices, default=Reservation.PaymentMode.WALLET)
    amount_kobo = models.BigIntegerField(default=150000) # ₦1,500.00
    vat_kobo = models.BigIntegerField(default=10465) # 7.5% split

    mismatch_flag = models.BooleanField(
        default=False,
        help_text="True if the returned battery did NOT match the battery last issued to this vehicle."
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    client_event_id = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        mismatch_str = " [MISMATCH]" if self.mismatch_flag else ""
        return f"Swap #{self.id.hex[:8]} - {self.vehicle.registration_plate} at {self.hub.code}{mismatch_str}"
