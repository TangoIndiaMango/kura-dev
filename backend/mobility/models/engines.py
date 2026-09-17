"""Path B — petrol engine custody + retrofit workflow (PRD 5.4 / F9)."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from accounts.models import Account
from core.models import BaseModel
from mobility.models.hubs import Hub
from mobility.models.vehicles import Vehicle

# PRD 5.4 — all six must pass before Retrofit.activate.
DEFAULT_SAFETY_CHECKLIST: dict[str, bool] = {
    "hull": False,
    "mount": False,
    "throttle": False,
    "kill": False,
    "cable": False,
    "float": False,
}


class PetrolEngine(BaseModel):
    """Surrendered ICE unit held as collateral / returnable asset."""

    class Status(models.TextChoices):
        STORED = "STORED", "Stored"
        RELEASE_REQUESTED = "RELEASE_REQUESTED", "Release requested"
        RELEASED = "RELEASED", "Released"
        DISPOSED = "DISPOSED", "Disposed"

    class ConditionGrade(models.TextChoices):
        GOOD = "GOOD", "Good"
        FAIR = "FAIR", "Fair"
        POOR = "POOR", "Poor"
        UNKNOWN = "UNKNOWN", "Unknown / as recorded"

    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="petrol_engines"
    )
    tag = models.CharField(max_length=40, unique=True, db_index=True)
    make = models.CharField(max_length=80, blank=True, default="")
    model = models.CharField(max_length=80, blank=True, default="")
    hp = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Display HP as recorded at intake (e.g. '15').",
    )
    condition_grade = models.CharField(
        max_length=20,
        choices=ConditionGrade.choices,
        default=ConditionGrade.UNKNOWN,
    )
    intake_photos = models.JSONField(
        default=list,
        blank=True,
        help_text="Cloudinary public_ids / MediaAsset ids from intake.",
    )
    intake_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="engines_intake_as_agent",
        null=True,
        blank=True,
    )
    intake_witness = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="engines_intake_as_witness",
        null=True,
        blank=True,
    )
    storage_hub = models.ForeignKey(
        Hub,
        on_delete=models.PROTECT,
        related_name="stored_engines",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.STORED,
        db_index=True,
    )
    intake_signature = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Cloudinary public_id for signed intake acknowledgement.",
    )
    released_at = models.DateTimeField(null=True, blank=True)
    release_photos = models.JSONField(default=list, blank=True)
    release_signature = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Media public_id for signed release acknowledgement.",
    )
    release_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engines_released",
    )
    raw = models.JSONField(
        default=dict,
        blank=True,
        help_text="Extensible intake/OEM extras without schema churn.",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account", "status"]),
            models.Index(fields=["storage_hub", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.tag} [{self.status}]"


class Retrofit(BaseModel):
    """Path B conversion job: intake → install → checklist → activate."""

    class Status(models.TextChoices):
        INTAKE = "INTAKE", "Intake"
        INSTALLED = "INSTALLED", "Installed"
        CHECKED = "CHECKED", "Safety checked"
        ACTIVATED = "ACTIVATED", "Activated"
        FAILED = "FAILED", "Failed"

    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="retrofits"
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.PROTECT, related_name="retrofits"
    )
    petrol_engine = models.OneToOneField(
        PetrolEngine,
        on_delete=models.PROTECT,
        related_name="retrofit",
        null=True,
        blank=True,
    )
    eboarder_serial = models.CharField(max_length=64, blank=True, default="")
    eboarder = models.ForeignKey(
        "mobility.EBoarder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retrofits",
    )
    checklist = models.JSONField(
        default=dict,
        blank=True,
        help_text="Six pass/fail keys: hull, mount, throttle, kill, cable, float.",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retrofits_as_agent",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INTAKE,
        db_index=True,
    )
    photos = models.JSONField(
        default=list,
        blank=True,
        help_text="Canoe / install media public_ids.",
    )
    activated_at = models.DateTimeField(null=True, blank=True)
    raw = models.JSONField(
        default=dict,
        blank=True,
        help_text="Wizard extras, OEM payloads, failure notes.",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account", "status"]),
            models.Index(fields=["vehicle", "status"]),
        ]

    def __str__(self) -> str:
        return f"Retrofit {self.id} [{self.status}]"

    def ensure_checklist_defaults(self) -> dict[str, bool]:
        merged = {**DEFAULT_SAFETY_CHECKLIST, **(self.checklist or {})}
        self.checklist = {k: bool(merged.get(k)) for k in DEFAULT_SAFETY_CHECKLIST}
        return self.checklist

    def checklist_all_passed(self) -> bool:
        checks = {**DEFAULT_SAFETY_CHECKLIST, **(self.checklist or {})}
        return all(bool(checks.get(k)) for k in DEFAULT_SAFETY_CHECKLIST)
