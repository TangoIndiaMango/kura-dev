from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from core.ids import kura_id
from core.models import BaseModel


class UserManager(BaseUserManager):
    def create_user(self, email=None, phone=None, password=None, **extra_fields):
        if not email and not phone:
            raise ValueError("Either email or phone must be provided")
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
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPER_ADMIN)
        if not email:
            raise ValueError("Superuser must have an email address")
        return self.create_user(email=email, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        OPS_MANAGER = "OPS_MANAGER", "Operations Manager"
        HUB_AGENT = "HUB_AGENT", "Hub Agent"
        COMMERCIAL_ADMIN = "COMMERCIAL_ADMIN", "Commercial Admin"
        GOVERNMENT_VIEWER = "GOVERNMENT_VIEWER", "Government Viewer"
        PARTNER_VIEWER = "PARTNER_VIEWER", "Partner Viewer"
        DRIVER = "DRIVER", "Driver / Operator"
        FLEET_OWNER = "FLEET_OWNER", "Fleet Owner"
        COOPERATIVE_CHAIRMAN = "COOPERATIVE_CHAIRMAN", "Cooperative Chairman"

    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=30, unique=True, null=True, blank=True)
    public_id = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Human-facing user code (ST-XXXXXX staff, OP-XXXXXX operators).",
    )
    first_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    avatar = models.ForeignKey(
        "core.MediaAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_avatars",
    )
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.DRIVER)
    assigned_role = models.ForeignKey(
        "accounts.Role",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    pin_hash = models.CharField(max_length=255, blank=True, default="")
    pin_failed_attempts = models.PositiveSmallIntegerField(default=0)
    pin_locked_until = models.DateTimeField(null=True, blank=True)
    session_version = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    class OnboardingStep(models.TextChoices):
        PIN = "pin", "Set PIN"
        PROFILE = "profile", "Complete profile"
        VEHICLE = "vehicle", "Add vehicle"
        PLAN = "plan", "Choose plan"
        DONE = "home", "Done"

    onboarding_step = models.CharField(
        max_length=20,
        choices=OnboardingStep.choices,
        default=OnboardingStep.PIN,
        db_index=True,
    )
    notification_prefs = models.JSONField(
        default=dict,
        blank=True,
        help_text='Channel toggles, e.g. {"email": true, "push": true}.',
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        name = f"{self.first_name} {self.last_name}".strip() or self.phone or self.email
        return f"{name} ({self.role})"

    def save(self, *args, **kwargs):
        if self.assigned_role and self.role != self.assigned_role.code:
            self.role = self.assigned_role.code
        if not self.public_id:
            prefix = (
                "OP"
                if self.role in {self.Role.DRIVER, self.Role.FLEET_OWNER}
                else "ST"
            )
            for _ in range(12):
                candidate = kura_id(prefix, 6)
                if not User.objects.filter(public_id=candidate).exclude(pk=self.pk).exists():
                    self.public_id = candidate
                    break
            else:
                self.public_id = kura_id(prefix, 8)
        super().save(*args, **kwargs)

    def set_pin(self, raw_pin: str):
        self.pin_hash = make_password(str(raw_pin))

    def check_pin(self, raw_pin: str) -> bool:
        if not self.pin_hash:
            return False
        return check_password(str(raw_pin), self.pin_hash)
