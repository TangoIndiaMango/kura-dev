"""Optional vehicle ↔ driver assignment — null means unrestricted on the account."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.models import Driver
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Vehicle, VehicleAssignment


class VehicleAssignmentService:
    @staticmethod
    def _close_open(*, vehicle: Vehicle, at) -> None:
        open_rows = list(
            VehicleAssignment.objects.select_for_update().filter(
                vehicle_id=vehicle.pk, ends_at__isnull=True
            )
        )
        for row in open_rows:
            row.ends_at = at
            row.save(update_fields=["ends_at", "updated_at"])

    @classmethod
    @transaction.atomic
    def assign(
        cls, *, vehicle: Vehicle, driver_id, actor=None, note: str = ""
    ) -> Vehicle:
        locked = (
            Vehicle.objects.select_for_update()
            .select_related("account")
            .get(pk=vehicle.pk)
        )
        before = {
            "assigned_driver_id": str(locked.assigned_driver_id)
            if locked.assigned_driver_id
            else None
        }
        now = timezone.now()
        cls._close_open(vehicle=locked, at=now)

        if driver_id in (None, ""):
            locked.assigned_driver = None
            locked.save(update_fields=["assigned_driver", "updated_at"])
            emit_event(
                action="vehicle.assignment_cleared",
                subject_type="vehicle",
                subject_id=str(locked.id),
                subject_label=locked.registration_plate,
                actor=actor,
                before=before,
                after={"assigned_driver_id": None},
                metadata={"note": (note or "").strip()[:200]},
            )
            return locked

        driver = Driver.objects.select_related("account").filter(pk=driver_id).first()
        if driver is None:
            raise DomainError("NOT_FOUND", "Driver not found.", http=404)
        if driver.account_id != locked.account_id:
            raise DomainError(
                "VALIDATION_ERROR",
                "Driver must belong to the same account as the vehicle.",
                http=400,
            )
        if driver.status != "ACTIVE":
            raise DomainError(
                "VALIDATION_ERROR",
                "Only ACTIVE drivers can be assigned.",
                http=409,
            )
        locked.assigned_driver = driver
        locked.save(update_fields=["assigned_driver", "updated_at"])
        VehicleAssignment.objects.create(
            vehicle=locked,
            driver=driver,
            starts_at=now,
            note=(note or "").strip()[:255],
        )
        emit_event(
            action="vehicle.assigned",
            subject_type="vehicle",
            subject_id=str(locked.id),
            subject_label=locked.registration_plate,
            actor=actor,
            before=before,
            after={"assigned_driver_id": str(driver.id)},
            metadata={"note": (note or "").strip()[:200]},
        )
        return locked
