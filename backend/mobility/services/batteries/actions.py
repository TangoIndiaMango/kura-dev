"""Battery custody verbs — transfer / fault / found / retire."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Battery, Hub
from mobility.models import BatteryEvent
from mobility.services.batteries.custody import (
    FAULT_FROM,
    FOUND_FROM,
    RETIRE_FROM,
    TRANSFER_FROM,
    apply_custodian,
    assert_transition,
    clear_hub_slot,
    record_battery_event,
)
from notifications.models import Notification


def _snap(battery: Battery) -> dict:
    return {
        "serial": battery.serial,
        "status": battery.status,
        "custodian_type": battery.custodian_type,
        "custodian_id": str(battery.custodian_id) if battery.custodian_id else None,
        "current_hub_id": str(battery.current_hub_id)
        if battery.current_hub_id
        else None,
        "charge_pct": battery.charge_pct,
        "health_pct": battery.health_pct,
    }


def _emit(battery, before, actor, action, note="", danger=False, metadata=None):
    notify = None
    if actor is not None:
        notify = NotifySpec(
            user=actor,
            title=f"Battery {battery.serial}",
            body=(note or action)[:200],
            source="Batteries",
            severity=(
                Notification.Severity.WARNING
                if danger
                else Notification.Severity.INFO
            ),
            link_path=f"/batteries/{battery.id}",
            template_code=action,
            dedupe_key=f"{action}:{battery.id}",
        )
    emit_event(
        action=action,
        subject_type="battery",
        subject_id=str(battery.id),
        subject_label=battery.serial,
        actor=actor,
        before=before,
        after=_snap(battery),
        metadata=metadata if metadata is not None else ({"note": note} if note else None),
        notify=notify,
    )


@transaction.atomic
def transfer_battery(
    *,
    battery: Battery,
    destination: str,
    hub_id=None,
    actor=None,
    note: str = "",
) -> Battery:
    locked = (
        Battery.objects.select_for_update(of=("self",))
        .select_related("current_hub")
        .get(pk=battery.pk)
    )
    assert_transition(battery=locked, allowed_from=TRANSFER_FROM, verb="transfer")
    before = _snap(locked)
    from_type, from_id = locked.custodian_type, locked.custodian_id
    clear_hub_slot(locked)
    dest = (destination or "").strip().lower()

    if dest == "hub":
        if not hub_id:
            raise DomainError("VALIDATION_ERROR", "hub_id required for hub transfer.")
        try:
            hub = Hub.objects.get(pk=hub_id)
        except Hub.DoesNotExist as exc:
            raise DomainError("NOT_FOUND", "Hub not found.") from exc
        apply_custodian(
            locked,
            custodian_type=Battery.Custodian.TRANSIT,
            custodian_id=hub.id,
            hub=hub,
        )
        if locked.status not in (
            Battery.Status.FAULTED,
            Battery.Status.CHARGING,
            Battery.Status.AVAILABLE,
        ):
            locked.status = Battery.Status.AVAILABLE
    elif dest == "workshop":
        if not hub_id:
            raise DomainError(
                "VALIDATION_ERROR", "hub_id required for workshop transfer."
            )
        try:
            hub = Hub.objects.get(pk=hub_id)
        except Hub.DoesNotExist as exc:
            raise DomainError("NOT_FOUND", "Hub not found.") from exc
        apply_custodian(
            locked,
            custodian_type=Battery.Custodian.WORKSHOP,
            custodian_id=hub.id,
            hub=hub,
        )
        locked.status = Battery.Status.FAULTED
    elif dest == "transit":
        hub = None
        if hub_id:
            try:
                hub = Hub.objects.get(pk=hub_id)
            except Hub.DoesNotExist as exc:
                raise DomainError("NOT_FOUND", "Hub not found.") from exc
        apply_custodian(
            locked,
            custodian_type=Battery.Custodian.TRANSIT,
            custodian_id=hub.id if hub else None,
            hub=hub,
            clear_hub=hub is None,
        )
        locked.status = Battery.Status.UNAVAILABLE
    else:
        raise DomainError(
            "VALIDATION_ERROR",
            "destination must be hub, workshop, or transit.",
        )

    locked.save()
    record_battery_event(
        battery=locked,
        event=BatteryEvent.Event.TRANSFERRED,
        actor=actor,
        hub=locked.current_hub,
        from_type=from_type,
        from_id=from_id,
        to_type=locked.custodian_type,
        to_id=locked.custodian_id,
        meta={"destination": dest, "note": note},
    )
    _emit(
        locked,
        before,
        actor,
        "battery.transferred",
        note=note or dest,
        metadata={"destination": dest, "note": note},
    )
    return locked


@transaction.atomic
def fault_battery(*, battery: Battery, actor=None, note: str = "") -> Battery:
    locked = Battery.objects.select_for_update().get(pk=battery.pk)
    assert_transition(battery=locked, allowed_from=FAULT_FROM, verb="fault")
    before = _snap(locked)
    from_type, from_id = locked.custodian_type, locked.custodian_id
    locked.status = Battery.Status.FAULTED
    if locked.current_hub_id:
        apply_custodian(
            locked,
            custodian_type=Battery.Custodian.WORKSHOP,
            custodian_id=locked.current_hub_id,
            hub=locked.current_hub,
        )
    locked.save()
    record_battery_event(
        battery=locked,
        event=BatteryEvent.Event.FAULT,
        actor=actor,
        from_type=from_type,
        from_id=from_id,
        to_type=locked.custodian_type,
        to_id=locked.custodian_id,
        meta={"note": note},
    )
    _emit(locked, before, actor, "battery.faulted", note=note, danger=True)
    return locked


@transaction.atomic
def found_battery(*, battery: Battery, actor=None, note: str = "") -> Battery:
    locked = Battery.objects.select_for_update().get(pk=battery.pk)
    assert_transition(battery=locked, allowed_from=FOUND_FROM, verb="found")
    before = _snap(locked)
    from_type, from_id = locked.custodian_type, locked.custodian_id
    locked.status = Battery.Status.AVAILABLE
    locked.save(update_fields=["status", "updated_at"])
    record_battery_event(
        battery=locked,
        event=BatteryEvent.Event.FOUND,
        actor=actor,
        from_type=from_type,
        from_id=from_id,
        to_type=locked.custodian_type,
        to_id=locked.custodian_id,
        meta={"note": note},
    )
    _emit(locked, before, actor, "battery.found", note=note)
    return locked


@transaction.atomic
def mark_lost_battery(*, battery: Battery, actor=None, note: str = "") -> Battery:
    locked = Battery.objects.select_for_update().get(pk=battery.pk)
    if locked.status == Battery.Status.RETIRED:
        raise DomainError(
            "INVALID_TRANSITION",
            "Retired batteries cannot be marked lost.",
            http=409,
        )
    if locked.status == Battery.Status.LOST:
        return locked
    before = _snap(locked)
    from_type, from_id = locked.custodian_type, locked.custodian_id
    clear_hub_slot(locked)
    locked.status = Battery.Status.LOST
    apply_custodian(
        locked,
        custodian_type=Battery.Custodian.NONE,
        custodian_id=None,
        clear_hub=True,
    )
    locked.save()
    record_battery_event(
        battery=locked,
        event=BatteryEvent.Event.LOST,
        actor=actor,
        from_type=from_type,
        from_id=from_id,
        to_type=Battery.Custodian.NONE,
        to_id=None,
        meta={"note": note},
    )
    _emit(locked, before, actor, "battery.lost", note=note, danger=True)
    return locked


@transaction.atomic
def retire_battery(*, battery: Battery, actor=None, note: str = "") -> Battery:
    locked = Battery.objects.select_for_update().get(pk=battery.pk)
    assert_transition(battery=locked, allowed_from=RETIRE_FROM, verb="retire")
    before = _snap(locked)
    from_type, from_id = locked.custodian_type, locked.custodian_id
    clear_hub_slot(locked)
    locked.status = Battery.Status.RETIRED
    apply_custodian(
        locked,
        custodian_type=Battery.Custodian.NONE,
        custodian_id=None,
        clear_hub=True,
    )
    locked.issued_at = None
    locked.expected_return_by = None
    locked.save()
    record_battery_event(
        battery=locked,
        event=BatteryEvent.Event.RETIRED,
        actor=actor,
        from_type=from_type,
        from_id=from_id,
        to_type=Battery.Custodian.NONE,
        to_id=None,
        meta={"note": note},
    )
    _emit(locked, before, actor, "battery.retired", note=note, danger=True)
    return locked
