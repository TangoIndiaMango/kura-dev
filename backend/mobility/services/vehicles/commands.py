"""Queue soft VCU commands — OEM/device delivery is async; we audit immediately."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Vehicle, VehicleCommand


class VehicleCommandService:
    @classmethod
    @transaction.atomic
    def enqueue(
        cls,
        *,
        vehicle: Vehicle,
        kind: str,
        actor=None,
        note: str = "",
    ) -> VehicleCommand:
        if kind not in VehicleCommand.Kind.values:
            raise DomainError("VALIDATION_ERROR", f"Unknown command: {kind}", http=400)
        if vehicle.status == Vehicle.Status.RETIRED:
            raise DomainError(
                "INVALID_TRANSITION",
                "Cannot command a retired vehicle.",
                http=409,
            )
        locked = Vehicle.objects.select_for_update().get(pk=vehicle.pk)
        # Soft path: queue for telematics/VCU. Without OEM link, stays QUEUED (ops visible).
        row = VehicleCommand.objects.create(
            vehicle=locked,
            kind=kind,
            status=VehicleCommand.Status.QUEUED,
            requested_by=actor,
            note=(note or "").strip()[:255],
        )
        if locked.iot_api_key_hash:
            row.status = VehicleCommand.Status.SENT
            row.save(update_fields=["status", "updated_at"])
        emit_event(
            action="vehicle.command_queued",
            subject_type="vehicle",
            subject_id=str(locked.id),
            subject_label=locked.registration_plate,
            actor=actor,
            after={
                "command_id": str(row.id),
                "kind": row.kind,
                "status": row.status,
            },
            metadata={"note": row.note[:200]},
        )
        return row

    @classmethod
    @transaction.atomic
    def ack(cls, *, command: VehicleCommand, actor=None, error: str = "") -> VehicleCommand:
        locked = VehicleCommand.objects.select_for_update().get(pk=command.pk)
        if locked.status in {
            VehicleCommand.Status.ACKED,
            VehicleCommand.Status.CANCELLED,
        }:
            return locked
        if error:
            locked.status = VehicleCommand.Status.FAILED
            locked.error = error[:255]
        else:
            locked.status = VehicleCommand.Status.ACKED
            locked.acked_at = timezone.now()
        locked.save(
            update_fields=["status", "error", "acked_at", "updated_at"]
        )
        emit_event(
            action="vehicle.command_acked",
            subject_type="vehicle",
            subject_id=str(locked.vehicle_id),
            actor=actor,
            after={"command_id": str(locked.id), "status": locked.status},
        )
        return locked
