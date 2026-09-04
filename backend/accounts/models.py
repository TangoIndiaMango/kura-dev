import random
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.hashers import make_password, check_password
from django.db import models
from core.models import BaseModel

class UserManager(BaseUserManager):
    def create_user(self, email=None, phone=None, password=None, **extra_fields):
        if not email and not phone:
            raise ValueError('Either email or phone must be provided')
        if email:
            email = self.normalize_email(email)
        user = self.model(email=email, phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.SUPER_ADMIN)
        if not email:
            raise ValueError('Superuser must have an email address')
        return self.create_user(email=email, password=password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        OPS_MANAGER = 'OPS_MANAGER', 'Operations Manager'
        HUB_AGENT = 'HUB_AGENT', 'Hub Agent'
        DRIVER = 'DRIVER', 'Driver / Operator'

    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=30, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.DRIVER)
    pin_hash = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        name = f"{self.first_name} {self.last_name}".strip() or self.phone or self.email
        return f"{name} ({self.role})"

    def set_pin(self, raw_pin: str):
        self.pin_hash = make_password(str(raw_pin))

    def check_pin(self, raw_pin: str) -> bool:
        if not self.pin_hash:
            return False
        return check_password(str(raw_pin), self.pin_hash)

class Account(BaseModel):
    class Kind(models.TextChoices):
        INDIVIDUAL = 'INDIVIDUAL', 'Individual Rider'
        FLEET = 'FLEET', 'Commercial Fleet'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        PENDING = 'PENDING', 'Pending Verification'

    class KycStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        VERIFIED = 'VERIFIED', 'Verified'
        REJECTED = 'REJECTED', 'Rejected'

    kura_id = models.CharField(max_length=30, unique=True, db_index=True)
    owner_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.INDIVIDUAL)
    display_name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    kyc_status = models.CharField(max_length=20, choices=KycStatus.choices, default=KycStatus.VERIFIED)

    def save(self, *args, **kwargs):
        if not self.kura_id:
            rand_code = ''.join(random.choices('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', k=6))
            self.kura_id = f"KR-{rand_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.kura_id} - {self.display_name}"

class Driver(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='drivers')
    license_number = models.CharField(max_length=50, blank=True, default='')
    status = models.CharField(max_length=20, default='ACTIVE')

    def __str__(self):
        return f"Driver {self.user.first_name} {self.user.last_name} ({self.account.kura_id})"

class StaffMembership(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=50)
    hub_id = models.CharField(max_length=100, blank=True, default='*') # '*' means global

    def __str__(self):
        return f"{self.user.email} - {self.role} (Hub: {self.hub_id})"
