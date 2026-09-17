"""Battery admin domain mutations — commission / patch / status routing."""
from __future__ import annotations

import secrets

from django.db import IntegrityError, transaction

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Battery, BatteryType, Hub
from mobility.models import BatteryEvent
from mobility.services.batteries.actions import (
    fault_battery,
    found_battery,
    mark_lost_battery,
    retire_battery,
    transfer_battery,
)
from mobility.services.batteries.custody import (
    SWAP_ONLY_STATUSES,
    apply_custodian,
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
        "cycle_count": battery.cycle_count,
    }


def _emit(battery, before, actor, action, note="", danger=False):
    notify = None
    if actor is not None and danger:
        notify = NotifySpec(
            user=actor,
            title=f"Battery {battery.serial}",
            body=(note or action)[:200],
            source="Batteries",
            severity=Notification.Severity.WARNING,
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
        metadata={"note": note} if note else None,
        notify=notify,
    )


class BatteryService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> Battery:
        serial = (data.get("serial") or "").strip()
        type_id = data.get("battery_type_id")
        if not serial:
            raise DomainError("VALIDATION_ERROR", "serial is required.")
        if not type_id:
            raise DomainError("VALIDATION_ERROR", "battery_type_id is required.")
        if Battery.objects.filter(serial__iexact=serial).exists():
            raise DomainError("CONFLICT", "Battery serial already exists.")
        try:
            btype = BatteryType.objects.get(pk=type_id)
        except BatteryType.DoesNotExist as exc:
            raise DomainError("NOT_FOUND", "Battery type not found.") from exc

        hub = None
        hub_id = data.get("current_hub_id") or data.get("current_hub")
        if hub_id:
            try:
                hub = Hub.objects.get(pk=hub_id)
            except Hub.DoesNotExist as exc:
                raise DomainError("NOT_FOUND", "Hub not found.") from exc

        status = data.get("status") or Battery.Status.AVAILABLE
        if status not in {
            Battery.Status.AVAILABLE,
            Battery.Status.CHARGING,
            Battery.Status.FAULTED,
            Battery.Status.UNAVAILABLE,
        }:
            raise DomainError(
                "VALIDATION_ERROR",
                "New batteries may only be AVAILABLE, CHARGING, FAULTED, or UNAVAILABLE.",
            )

        try:
            battery = Battery.objects.create(
                serial=serial,
                battery_type=btype,
                status=status,
                charge_pct=int(data.get("charge_pct", 100)),
                charge_source=data.get("charge_source") or Battery.ChargeSource.MANUAL,
                health_pct=int(data.get("health_pct", 100)),
                cycle_count=int(data.get("cycle_count", 0)),
                manufactured_at=data.get("manufactured_at"),
                qr_secret=secrets.token_urlsafe(24),
            )
        except IntegrityError as exc:
            raise DomainError("CONFLICT", "Battery serial already exists.") from exc

        if hub is not None:
            apply_custodian(
                battery,
                custodian_type=Battery.Custodian.TRANSIT,
                custodian_id=hub.id,
                hub=hub,
            )
            battery.save(
                update_fields=[
                    "current_hub",
                    "custodian_type",
                    "custodian_id",
                    "updated_at",
                ]
            )
        else:
            apply_custodian(
                battery,
                custodian_type=Battery.Custodian.NONE,
                custodian_id=None,
                clear_hub=True,
            )
            battery.save(
                update_fields=["custodian_type", "custodian_id", "updated_at"]
            )

        record_battery_event(
            battery=battery,
            event=BatteryEvent.Event.RECEIVED,
            actor=actor,
            hub=hub,
            to_type=battery.custodian_type,
            to_id=battery.custodian_id,
            meta={"serial": serial},
            source=BatteryEvent.Source.APP,
        )
        _emit(battery, None, actor, "battery.commissioned")
        return battery

    @staticmethod
    @transaction.atomic
    def update(*, battery: Battery, data: dict, actor=None) -> Battery:
        locked = (
            Battery.objects.select_for_update(of=("self",))
            .select_related("current_hub")
            .get(pk=battery.pk)
        )
        if locked.status == Battery.Status.RETIRED:
            raise DomainError(
                "CONFLICT",
                "Retired batteries are immutable.",
                http=409,
            )
        if locked.status in SWAP_ONLY_STATUSES:
            raise DomainError(
                "CONFLICT",
                f"Cannot PATCH while status is {locked.status}; use swap or transfer.",
                http=409,
            )
        if "current_hub_id" in data or "current_hub" in data:
            raise DomainError(
                "FORBIDDEN",
                "Move batteries via POST /batteries/{id}/transfer/.",
                http=403,
            )
        if "status" in data and data["status"] != locked.status:
            raise DomainError(
                "FORBIDDEN",
                "Change status via transfer/fault/found/retire actions.",
                http=403,
            )

        before = _snap(locked)
        if "battery_type_id" in data and data["battery_type_id"]:
            try:
                locked.battery_type = BatteryType.objects.get(
                    pk=data["battery_type_id"]
                )
            except BatteryType.DoesNotExist as exc:
                raise DomainError("NOT_FOUND", "Battery type not found.") from exc
        for field in ("charge_pct", "health_pct", "cycle_count", "charge_source"):
            if field in data and data[field] is not None:
                setattr(locked, field, data[field])
        if "manufactured_at" in data:
            locked.manufactured_at = data.get("manufactured_at")
        if "serial" in data and data["serial"]:
            serial = data["serial"].strip()
            if (
                Battery.objects.filter(serial__iexact=serial)
                .exclude(pk=locked.pk)
                .exists()
            ):
                raise DomainError("CONFLICT", "Battery serial already exists.")
            locked.serial = serial
        locked.save()
        _emit(locked, before, actor, "battery.updated")
        return locked

    @staticmethod
    def set_status(
        *,
        battery: Battery,
        status: str,
        actor=None,
        note: str = "",
        current_hub_id=None,
        hub_provided: bool = False,
    ) -> Battery:
        """Legacy status endpoint — maps to custody verbs where possible."""
        target = (status or "").strip().upper()
        if hub_provided and current_hub_id:
            return transfer_battery(
                battery=battery,
                destination="hub",
                hub_id=current_hub_id,
                actor=actor,
                note=note,
            )
        if target == Battery.Status.FAULTED:
            return fault_battery(battery=battery, actor=actor, note=note)
        if target == Battery.Status.RETIRED:
            return retire_battery(battery=battery, actor=actor, note=note)
        if target == Battery.Status.LOST:
            return mark_lost_battery(battery=battery, actor=actor, note=note)
        if target == Battery.Status.AVAILABLE and battery.status in {
            Battery.Status.LOST,
            Battery.Status.FAULTED,
        }:
            return found_battery(battery=battery, actor=actor, note=note)
        if target in SWAP_ONLY_STATUSES:
            raise DomainError(
                "FORBIDDEN",
                f"{target} is set only by the swap engine.",
                http=403,
            )
        if target in {
            Battery.Status.CHARGING,
            Battery.Status.AVAILABLE,
            Battery.Status.UNAVAILABLE,
        }:
            return BatteryService._admin_status(
                battery=battery, status=target, actor=actor, note=note
            )
        raise DomainError("VALIDATION_ERROR", f"Unsupported status {target}.")

    @staticmethod
    @transaction.atomic
    def _admin_status(
        *, battery: Battery, status: str, actor=None, note: str = ""
    ) -> Battery:
        locked = Battery.objects.select_for_update().get(pk=battery.pk)
        if locked.status in SWAP_ONLY_STATUSES | {Battery.Status.RETIRED}:
            raise DomainError(
                "CONFLICT",
                f"Cannot set {status} from {locked.status}.",
                http=409,
            )
        before = _snap(locked)
        if status == Battery.Status.UNAVAILABLE:
            clear_hub_slot(locked)
        locked.status = status
        locked.save(update_fields=["status", "updated_at"])
        record_battery_event(
            battery=locked,
            event=BatteryEvent.Event.TRIAGED,
            actor=actor,
            meta={"status": status, "note": note},
        )
        _emit(locked, before, actor, "battery.status_changed", note=status)
        return locked

    transfer = staticmethod(transfer_battery)
    fault = staticmethod(fault_battery)
    found = staticmethod(found_battery)
    retire = staticmethod(retire_battery)
    mark_lost = staticmethod(mark_lost_battery)
