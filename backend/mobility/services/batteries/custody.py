"""Custody helpers — single custodian + hash-chained BatteryEvent (I1 / I8)."""
from __future__ import annotations

import hashlib
import json
from typing import Any
from uuid import UUID

from django.db import connection
from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Battery, Hub, HubSlot
from mobility.models import BatteryEvent

SWAP_ONLY_STATUSES = frozenset(
    {Battery.Status.ISSUED, Battery.Status.RESERVED}
)

TRANSFER_FROM = frozenset(
    {
        Battery.Status.AVAILABLE,
        Battery.Status.CHARGING,
        Battery.Status.RETURNED,
        Battery.Status.UNAVAILABLE,
        Battery.Status.FAULTED,
    }
)
FAULT_FROM = frozenset(
    {
        Battery.Status.AVAILABLE,
        Battery.Status.CHARGING,
        Battery.Status.RETURNED,
        Battery.Status.RESERVED,
        Battery.Status.UNAVAILABLE,
    }
)
FOUND_FROM = frozenset({Battery.Status.LOST, Battery.Status.FAULTED})
RETIRE_FROM = frozenset(
    {
        Battery.Status.FAULTED,
        Battery.Status.AVAILABLE,
        Battery.Status.UNAVAILABLE,
        Battery.Status.LOST,
        Battery.Status.RETURNED,
    }
)


def assert_transition(*, battery: Battery, allowed_from: frozenset[str], verb: str) -> None:
    if battery.status == Battery.Status.RETIRED:
        raise DomainError(
            "INVALID_TRANSITION",
            "Retired batteries are terminal and cannot change custody.",
            http=409,
        )
    if battery.status not in allowed_from:
        raise DomainError(
            "INVALID_TRANSITION",
            f"Cannot {verb} battery in status {battery.status}.",
            http=409,
        )


def clear_hub_slot(battery: Battery) -> None:
    slot = getattr(battery, "current_slot", None)
    if slot is None:
        return
    slot.battery = None
    slot.state = HubSlot.State.EMPTY
    slot.save(update_fields=["battery", "state", "updated_at"])


def apply_custodian(
    battery: Battery,
    *,
    custodian_type: str,
    custodian_id: UUID | None,
    hub: Hub | None = None,
    clear_hub: bool = False,
) -> None:
    battery.custodian_type = custodian_type
    battery.custodian_id = custodian_id
    if clear_hub:
        battery.current_hub = None
    elif hub is not None:
        battery.current_hub = hub


def _canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, default=str, separators=(",", ":"))


def _lock_battery_chain(battery_id: UUID) -> None:
    if connection.vendor == "postgresql":
        key = int(hashlib.sha256(str(battery_id).encode()).hexdigest()[:15], 16)
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [key])
        return
    (
        BatteryEvent.objects.select_for_update()
        .filter(battery_id=battery_id)
        .order_by("-occurred_at", "-id")
        .first()
    )


def record_battery_event(
    *,
    battery: Battery,
    event: str,
    actor=None,
    hub: Hub | None = None,
    swap=None,
    from_type: str = "",
    from_id: UUID | None = None,
    to_type: str = "",
    to_id: UUID | None = None,
    charge_pct: int | None = None,
    meta: dict[str, Any] | None = None,
    source: str = BatteryEvent.Source.APP,
) -> BatteryEvent:
    _lock_battery_chain(battery.id)
    prev_row = (
        BatteryEvent.objects.select_for_update()
        .filter(battery_id=battery.id)
        .order_by("-occurred_at", "-id")
        .only("row_hash")
        .first()
    )
    prev = (prev_row.row_hash if prev_row else "") or ""
    occurred = timezone.now()
    from_ct = from_type or battery.custodian_type
    from_cid = from_id if from_id is not None else battery.custodian_id
    body = {
        "battery_id": str(battery.id),
        "event": event,
        "from_custodian_type": from_ct,
        "from_custodian_id": str(from_cid) if from_cid else None,
        "to_custodian_type": to_type,
        "to_custodian_id": str(to_id) if to_id else None,
        "charge_pct": charge_pct if charge_pct is not None else battery.charge_pct,
        "meta": meta or {},
        "prev_hash": prev,
        "occurred_at": occurred.isoformat(),
        "source": source,
    }
    row_hash = hashlib.sha256(_canonical(body).encode()).hexdigest()
    return BatteryEvent.objects.create(
        battery=battery,
        event=event,
        from_custodian_type=from_ct,
        from_custodian_id=from_cid,
        to_custodian_type=to_type,
        to_custodian_id=to_id,
        actor=actor,
        hub=hub or battery.current_hub,
        swap=swap,
        charge_pct=charge_pct if charge_pct is not None else battery.charge_pct,
        meta=meta or {},
        occurred_at=occurred,
        source=source,
        prev_hash=prev,
        row_hash=row_hash,
    )


def sync_custodian_from_relations(battery: Battery) -> None:
    slot = getattr(battery, "current_slot", None)
    if slot is not None and slot.pk:
        apply_custodian(
            battery,
            custodian_type=Battery.Custodian.HUB_SLOT,
            custodian_id=slot.id,
            hub=slot.hub,
        )
        return
    vehicle = getattr(battery, "mounted_vehicle", None)
    if vehicle is not None and vehicle.pk:
        apply_custodian(
            battery,
            custodian_type=Battery.Custodian.VEHICLE,
            custodian_id=vehicle.id,
            clear_hub=True,
        )
        return
    if battery.current_hub_id:
        if battery.status == Battery.Status.FAULTED:
            apply_custodian(
                battery,
                custodian_type=Battery.Custodian.WORKSHOP,
                custodian_id=battery.current_hub_id,
                hub=battery.current_hub,
            )
        else:
            apply_custodian(
                battery,
                custodian_type=Battery.Custodian.TRANSIT,
                custodian_id=battery.current_hub_id,
                hub=battery.current_hub,
            )
        return
    apply_custodian(
        battery,
        custodian_type=Battery.Custodian.NONE,
        custodian_id=None,
        clear_hub=True,
    )
