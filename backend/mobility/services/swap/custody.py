"""Swap custody — return / issue / rollback helpers."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Battery, Hub, HubSlot, Swap, Vehicle
from mobility.models import BatteryEvent
from mobility.services.batteries.custody import apply_custodian, record_battery_event


def apply_return_custody(
    *,
    hub: Hub,
    vehicle: Vehicle,
    returned_battery: Battery,
    returned_charge_pct: int,
    swap: Swap,
    is_mismatch: bool,
    agent=None,
) -> None:
    returned_from = (returned_battery.custodian_type, returned_battery.custodian_id)
    if getattr(returned_battery, "current_slot", None) is not None:
        raise DomainError(
            "BATTERY_ALREADY_SLOTTED",
            f"Returned battery {returned_battery.serial} is already in a hub slot.",
            http=409,
        )

    returned_battery.status = Battery.Status.CHARGING
    returned_battery.charge_pct = returned_charge_pct
    returned_battery.charge_source = Battery.ChargeSource.MANUAL
    returned_battery.charge_observed_at = timezone.now()
    returned_battery.cycle_count += 1
    returned_battery.issued_at = None
    returned_battery.expected_return_by = None

    empty_slot = HubSlot.objects.filter(hub=hub, battery__isnull=True).first()
    if empty_slot:
        empty_slot.battery = returned_battery
        empty_slot.state = HubSlot.State.CHARGING
        empty_slot.save(update_fields=["battery", "state", "updated_at"])
        apply_custodian(
            returned_battery,
            custodian_type=Battery.Custodian.HUB_SLOT,
            custodian_id=empty_slot.id,
            hub=hub,
        )
    else:
        apply_custodian(
            returned_battery,
            custodian_type=Battery.Custodian.TRANSIT,
            custodian_id=hub.id,
            hub=hub,
        )
    returned_battery.save()

    if vehicle.current_battery_id == returned_battery.id:
        vehicle.current_battery = None
        vehicle.save(update_fields=["current_battery", "updated_at"])

    record_battery_event(
        battery=returned_battery,
        event=BatteryEvent.Event.RETURNED,
        actor=agent,
        hub=hub,
        swap=swap,
        from_type=returned_from[0],
        from_id=returned_from[1],
        to_type=returned_battery.custodian_type,
        to_id=returned_battery.custodian_id,
        charge_pct=returned_charge_pct,
        meta={"mismatch": is_mismatch},
        source=BatteryEvent.Source.HUB_APP,
    )


def apply_issue_custody(
    *,
    hub: Hub,
    vehicle: Vehicle,
    issued_battery: Battery,
    issued_charge_pct: int,
    swap: Swap,
    agent=None,
    first_swap: bool = False,
) -> None:
    issued_from = (issued_battery.custodian_type, issued_battery.custodian_id)
    issued_battery.status = Battery.Status.ISSUED
    issued_battery.charge_pct = issued_charge_pct
    issued_battery.charge_source = Battery.ChargeSource.MANUAL
    issued_battery.charge_observed_at = timezone.now()
    issued_battery.issued_at = timezone.now()
    issued_battery.expected_return_by = timezone.now() + timedelta(hours=48)

    slot = getattr(issued_battery, "current_slot", None)
    if slot is not None and slot.pk:
        slot.battery = None
        slot.state = HubSlot.State.EMPTY
        slot.save(update_fields=["battery", "state", "updated_at"])

    apply_custodian(
        issued_battery,
        custodian_type=Battery.Custodian.VEHICLE,
        custodian_id=vehicle.id,
        clear_hub=True,
    )
    issued_battery.save()

    vehicle.current_battery = issued_battery
    vehicle.save(update_fields=["current_battery", "updated_at"])

    from mobility.services.hubs.sync import touch_hub_last_sync

    touch_hub_last_sync(hub)

    record_battery_event(
        battery=issued_battery,
        event=BatteryEvent.Event.ISSUED,
        actor=agent,
        hub=hub,
        swap=swap,
        from_type=issued_from[0],
        from_id=issued_from[1],
        to_type=Battery.Custodian.VEHICLE,
        to_id=vehicle.id,
        charge_pct=issued_charge_pct,
        meta={"first_swap": first_swap} if first_swap else {},
        source=BatteryEvent.Source.HUB_APP,
    )


def rollback_issue_custody(
    *,
    hub: Hub,
    vehicle: Vehicle,
    issued_battery: Battery,
    swap: Swap,
    agent=None,
) -> None:
    """E4.7 — put issued pack back into a hub slot; clear vehicle mount."""
    from_type, from_id = issued_battery.custodian_type, issued_battery.custodian_id
    empty_slot = HubSlot.objects.filter(hub=hub, battery__isnull=True).first()
    issued_battery.status = Battery.Status.AVAILABLE
    issued_battery.issued_at = None
    issued_battery.expected_return_by = None
    if empty_slot:
        empty_slot.battery = issued_battery
        empty_slot.state = HubSlot.State.READY
        empty_slot.save(update_fields=["battery", "state", "updated_at"])
        apply_custodian(
            issued_battery,
            custodian_type=Battery.Custodian.HUB_SLOT,
            custodian_id=empty_slot.id,
            hub=hub,
        )
    else:
        apply_custodian(
            issued_battery,
            custodian_type=Battery.Custodian.TRANSIT,
            custodian_id=hub.id,
            hub=hub,
        )
    issued_battery.save()

    if vehicle.current_battery_id == issued_battery.id:
        vehicle.current_battery = None
        vehicle.save(update_fields=["current_battery", "updated_at"])

    record_battery_event(
        battery=issued_battery,
        event=BatteryEvent.Event.SLOTTED,
        actor=agent,
        hub=hub,
        swap=swap,
        from_type=from_type,
        from_id=from_id,
        to_type=issued_battery.custodian_type,
        to_id=issued_battery.custodian_id,
        charge_pct=issued_battery.charge_pct,
        meta={"abort": True},
        source=BatteryEvent.Source.HUB_APP,
    )


def apply_swap_battery_custody(
    *,
    hub: Hub,
    vehicle: Vehicle,
    returned_battery: Battery | None,
    issued_battery: Battery,
    returned_charge_pct: int,
    issued_charge_pct: int,
    swap: Swap,
    is_mismatch: bool,
    agent=None,
    first_swap: bool = False,
) -> None:
    """Legacy one-shot complete — return then issue in one transaction."""
    if returned_battery is not None:
        apply_return_custody(
            hub=hub,
            vehicle=vehicle,
            returned_battery=returned_battery,
            returned_charge_pct=returned_charge_pct,
            swap=swap,
            is_mismatch=is_mismatch,
            agent=agent,
        )
    apply_issue_custody(
        hub=hub,
        vehicle=vehicle,
        issued_battery=issued_battery,
        issued_charge_pct=issued_charge_pct,
        swap=swap,
        agent=agent,
        first_swap=first_swap,
    )
