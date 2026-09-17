"""Battery type dual-control — PENDING → ACTIVE (approver ≠ creator)."""
from __future__ import annotations

from django.db import transaction

from accounts.helpers.maker_checker import (
    assert_not_self_approve,
    self_approve_audit_metadata,
)
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import BatteryType, VehicleType


class BatteryTypeService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> BatteryType:
        name = (data.get("name") or "").strip()
        if not name:
            raise DomainError("VALIDATION_ERROR", "name is required.")
        row = BatteryType.objects.create(
            name=name,
            manufacturer=data.get("manufacturer") or "KURA Energy",
            capacity_kwh=data.get("capacity_kwh") or "3.24",
            nominal_voltage=int(data.get("nominal_voltage") or 72),
            vehicle_type=data.get("vehicle_type") or VehicleType.MOTORCYCLE,
            qr_scheme=data.get("qr_scheme") or BatteryType.QrScheme.SIGNED,
            status=BatteryType.Status.PENDING,
            created_by=actor,
        )
        emit_event(
            action="battery_type.proposed",
            subject_type="battery_type",
            subject_id=str(row.id),
            subject_label=row.name,
            actor=actor,
            after={"status": row.status, "qr_scheme": row.qr_scheme},
        )
        return row

    @staticmethod
    @transaction.atomic
    def activate(*, battery_type: BatteryType, actor=None) -> BatteryType:
        locked = BatteryType.objects.select_for_update().get(pk=battery_type.pk)
        if locked.status != BatteryType.Status.PENDING:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot activate type in status {locked.status}.",
                http=409,
            )
        assert_not_self_approve(
            actor=actor,
            created_by_id=locked.created_by_id,
            message="Creator cannot activate their own battery type.",
        )
        before = {"status": locked.status}
        locked.status = BatteryType.Status.ACTIVE
        locked.approved_by = actor
        locked.save(update_fields=["status", "approved_by", "updated_at"])
        emit_event(
            action="battery_type.activated",
            subject_type="battery_type",
            subject_id=str(locked.id),
            subject_label=locked.name,
            actor=actor,
            before=before,
            after={
                "status": locked.status,
                "approved_by_id": str(actor.id) if actor else None,
                "created_by_id": (
                    str(locked.created_by_id) if locked.created_by_id else None
                ),
            },
            metadata=self_approve_audit_metadata(
                actor=actor, created_by_id=locked.created_by_id
            ),
        )
        return locked
