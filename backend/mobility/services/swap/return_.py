"""F4 swap return — STARTED → RETURN_RECORDED."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Battery, Swap
from mobility.services.swap.custody import apply_return_custody
from risk.services import RiskService

MISMATCH_REASONS = {c.value for c in Swap.MismatchReason}


def record_return(
    *,
    swap: Swap,
    battery_serial: str,
    charge_pct: int = 15,
    mismatch_reason: str = "",
    agent=None,
) -> tuple[Swap, bool]:
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
            .select_related("vehicle", "hub", "account")
            .get(pk=swap.pk)
        )
        if locked.status != Swap.Status.STARTED:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot record return from status {locked.status}.",
                http=409,
            )

        battery = (
            Battery.objects.select_for_update(of=("self",))
            .filter(serial=serial)
            .first()
        )
        if battery is None:
            raise DomainError(
                "BATTERY_NOT_FOUND",
                f"Returned battery {serial} not found.",
                http=404,
            )

        vehicle = locked.vehicle
        if vehicle.current_battery_id is None:
            raise DomainError(
                "FIRST_SWAP_NO_RETURN",
                "This vehicle has no pack mounted — skip return and issue a charged pack.",
                http=409,
            )
        is_mismatch = bool(
            vehicle.current_battery_id
            and vehicle.current_battery_id != battery.id
        )
        reason = (mismatch_reason or "").strip().upper()
        if is_mismatch and reason not in MISMATCH_REASONS:
            raise DomainError(
                "VALIDATION_ERROR",
                "Mismatch requires reason: OTHER_HUB_ISSUED | REPLACED_BY_OPS | UNKNOWN.",
                details={"mismatch_reason": ["required"]},
                http=409,
            )

        apply_return_custody(
            hub=locked.hub,
            vehicle=vehicle,
            returned_battery=battery,
            returned_charge_pct=int(charge_pct),
            swap=locked,
            is_mismatch=is_mismatch,
            agent=agent,
        )

        locked.returned_battery = battery
        locked.returned_charge_pct = int(charge_pct)
        locked.mismatch_flag = is_mismatch
        locked.mismatch_reason = reason if is_mismatch else ""
        locked.status = Swap.Status.RETURN_RECORDED
        locked.save(
            update_fields=[
                "returned_battery",
                "returned_charge_pct",
                "mismatch_flag",
                "mismatch_reason",
                "status",
                "updated_at",
            ]
        )

        if is_mismatch:
            RiskService.emit(
                rule_code="BATTERY_MISMATCH",
                subject_type="swap",
                subject_id=str(locked.id),
                account=locked.account,
                context={"reason": reason, "serial": serial},
            )

        emit_event(
            action="swap.return_recorded",
            subject_type="swap",
            subject_id=str(locked.id),
            actor=agent,
            metadata={
                "serial": serial,
                "mismatch": is_mismatch,
                "mismatch_reason": reason if is_mismatch else None,
            },
        )
        return locked, is_mismatch
