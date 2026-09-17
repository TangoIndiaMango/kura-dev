"""Post-custody audit + rider notify on swap complete."""
from __future__ import annotations

from core.money import format_naira
from core.services.events import NotifySpec, emit_event
from mobility.models import Battery, Hub, Swap, Vehicle
from notifications.models import Notification


def finalize_completed_swap(
    *,
    swap: Swap,
    vehicle: Vehicle,
    hub: Hub,
    returned_battery: Battery | None,
    issued_battery: Battery,
    is_mismatch: bool,
    fee: int,
    mode: str,
    first_swap: bool,
    override: dict | None,
    agent,
) -> None:
    rider = _rider_user(swap)
    fee_bit = f" · {format_naira(fee)}" if fee > 0 else ""
    body = (
        f"{issued_battery.serial} issued at {hub.name} for "
        f"{vehicle.registration_plate}{fee_bit}."
    )
    notify = None
    if rider is not None:
        link = (
            f"/receipt/{swap.payment_id}"
            if getattr(swap, "payment_id", None)
            else "/swap"
        )
        notify = NotifySpec(
            user=rider,
            title="Swap complete",
            body=body,
            source="Swaps",
            severity=Notification.Severity.INFO,
            channels=(Notification.Channel.IN_APP, Notification.Channel.SMS),
            template_code="swap.completed",
            link_path=link,
            params={
                "swap_id": str(swap.id),
                "hub_code": hub.code,
                "vehicle": vehicle.registration_plate,
                "issued_serial": issued_battery.serial,
                "returned_serial": (
                    returned_battery.serial if returned_battery else None
                ),
                "amount_kobo": fee,
                "payment_mode": mode,
                "first_swap": first_swap,
            },
            dedupe_key=f"swap.completed:{swap.id}",
        )

    emit_event(
        action="swap.completed",
        subject_type="swap",
        subject_id=str(swap.id),
        actor=agent,
        metadata={
            "vehicle": vehicle.registration_plate,
            "returned": returned_battery.serial if returned_battery else None,
            "issued": issued_battery.serial,
            "mismatch": is_mismatch,
            "amount_kobo": fee,
            "payment_mode": mode,
            "first_swap": first_swap,
        },
        notify=notify,
    )
    if not override:
        return
    from operations.services.overrides import OverrideService

    OverrideService.record(
        agent=agent,
        reason=str(override.get("reason") or ""),
        note=str(override.get("note") or ""),
        pin_grant=str(override.get("agent_pin_grant") or ""),
        swap=swap,
        hub=hub,
    )


def _rider_user(swap: Swap):
    account = getattr(swap, "account", None)
    owner = getattr(account, "owner_user", None) if account is not None else None
    if owner is not None:
        return owner
    driver = getattr(swap, "driver", None)
    return getattr(driver, "user", None) if driver is not None else None
