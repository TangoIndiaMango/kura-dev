"""End-of-day inventory count vs system expected."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Hub, HubSlot
from operations.models import Alert, InventoryCount
from operations.services.alerts import AlertService


def _expected_map(hub: Hub) -> dict:
    out: dict[str, str] = {}
    for slot in HubSlot.objects.filter(hub=hub).select_related("battery"):
        if slot.battery_id and slot.battery:
            out[slot.battery.serial] = slot.state
    return out


@transaction.atomic
def submit_inventory_count(
    *,
    hub: Hub,
    counted: dict,
    actor,
    shift=None,
    note: str = "",
) -> InventoryCount:
    if not isinstance(counted, dict):
        raise DomainError("VALIDATION_ERROR", "counted must be an object of serial→state.")
    expected = _expected_map(hub)
    counted_norm = {str(k).upper(): str(v).upper() for k, v in counted.items()}
    expected_norm = {str(k).upper(): str(v).upper() for k, v in expected.items()}
    missing = sorted(set(expected_norm) - set(counted_norm))
    unexpected = sorted(set(counted_norm) - set(expected_norm))
    state_mismatch = sorted(
        s
        for s in set(expected_norm) & set(counted_norm)
        if expected_norm[s] != counted_norm[s]
    )
    variance = {
        "missing": missing,
        "unexpected": unexpected,
        "state_mismatch": state_mismatch,
    }
    row = InventoryCount.objects.create(
        hub=hub,
        shift=shift,
        counted=counted_norm,
        expected=expected_norm,
        variance=variance,
        signed_by=actor,
        note=(note or "")[:255],
    )
    emit_event(
        action="inventory_count.submitted",
        subject_type="inventory_count",
        subject_id=str(row.id),
        subject_label=hub.code,
        actor=actor,
        after={"variance": variance, "hub_id": str(hub.id)},
    )
    if missing or unexpected or state_mismatch:
        AlertService.open(
            kind=Alert.Kind.LOW_INVENTORY,
            severity=Alert.Severity.WARNING,
            message=f"Inventory variance at {hub.code}: "
            f"missing={len(missing)} unexpected={len(unexpected)} "
            f"mismatch={len(state_mismatch)}",
            hub=hub,
        )
    return row
