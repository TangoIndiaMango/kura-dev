"""F4 swap issue — STARTED|RETURN_RECORDED → ISSUED."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Battery, Reservation, Swap
from mobility.services.swap.custody import apply_issue_custody


def issue_battery(
    *,
    swap: Swap,
    battery_serial: str,
    charge_pct: int = 100,
    agent=None,
) -> Swap:
    serial = (battery_serial or "").strip()
    if not serial:
        raise DomainError(
            "VALIDATION_ERROR",
            "battery_serial is required.",
            details={"battery_serial": ["required"]},
        )

    with transaction.atomic():
        locked = (
            Swap.objects.select_for_update(of=("self",))
            .select_related(
                "vehicle__vehicle_model__battery_type",
                "hub",
                "returned_battery",
            )
            .get(pk=swap.pk)
        )
        first_swap_path = (
            locked.status == Swap.Status.STARTED
            and locked.vehicle.current_battery_id is None
        )
        if locked.status == Swap.Status.STARTED and not first_swap_path:
            raise DomainError(
                "INVALID_TRANSITION",
                "Record the returned pack before issuing.",
                http=409,
            )
        if locked.status not in {
            Swap.Status.STARTED,
            Swap.Status.RETURN_RECORDED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot issue from status {locked.status}.",
                http=409,
            )

        battery = (
            Battery.objects.select_for_update(of=("self",))
            .select_related("battery_type")
            .filter(serial=serial)
            .first()
        )
        if battery is None:
            raise DomainError(
                "BATTERY_NOT_FOUND",
                f"Issued battery {serial} not found.",
                http=404,
            )
        if battery.status not in {
            Battery.Status.AVAILABLE,
            Battery.Status.RESERVED,
        }:
            raise DomainError(
                "BATTERY_NOT_AVAILABLE",
                f"Battery {serial} is {battery.status}.",
                details={
                    "status": battery.status,
                    "custodian_type": battery.custodian_type,
                    "custodian_id": str(battery.custodian_id or ""),
                },
                http=409,
            )
        if battery.status == Battery.Status.RESERVED:
            own_pack_id = (
                Reservation.objects.filter(pk=locked.reservation_id)
                .values_list("battery_id", flat=True)
                .first()
                if locked.reservation_id
                else None
            )
            if battery.id != own_pack_id:
                raise DomainError(
                    "BATTERY_NOT_AVAILABLE",
                    f"Battery {serial} is held for another reservation.",
                    details={"status": battery.status},
                    http=409,
                )
        if battery.current_hub_id and battery.current_hub_id != locked.hub_id:
            raise DomainError(
                "BATTERY_NOT_AVAILABLE",
                f"Battery {serial} is not at this hub.",
                http=409,
            )

        expected_type = locked.vehicle.vehicle_model.battery_type_id
        if expected_type and battery.battery_type_id != expected_type:
            raise DomainError(
                "BATTERY_TYPE_INCOMPATIBLE",
                f"Battery {serial} type does not match this vehicle.",
                details={
                    "expected": str(expected_type),
                    "got": str(battery.battery_type_id),
                },
                http=409,
            )

        apply_issue_custody(
            hub=locked.hub,
            vehicle=locked.vehicle,
            issued_battery=battery,
            issued_charge_pct=int(charge_pct),
            swap=locked,
            agent=agent,
            first_swap=first_swap_path,
        )

        locked.issued_battery = battery
        locked.issued_charge_pct = int(charge_pct)
        locked.status = Swap.Status.ISSUED
        locked.save(
            update_fields=[
                "issued_battery",
                "issued_charge_pct",
                "status",
                "updated_at",
            ]
        )

        emit_event(
            action="swap.issued",
            subject_type="swap",
            subject_id=str(locked.id),
            actor=agent,
            metadata={"serial": serial, "first_swap": first_swap_path},
        )
        return locked
