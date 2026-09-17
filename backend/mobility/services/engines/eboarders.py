"""E-boarder fleet mutations."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import Account
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import BatteryType, EBoarder, Hub, Vehicle


class EBoarderService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> EBoarder:
        serial = (data.get("serial") or "").strip().upper()
        model = (data.get("model") or "").strip()
        if not serial or not model:
            raise DomainError("VALIDATION", "serial and model are required.")
        rated = data.get("rated_watts")
        if rated is None or int(rated) <= 0:
            raise DomainError("VALIDATION", "rated_watts must be a positive integer.")
        battery_type = data.get("battery_type")
        if battery_type is None:
            raise DomainError("VALIDATION", "battery_type is required.")
        if not isinstance(battery_type, BatteryType):
            battery_type = BatteryType.objects.get(pk=battery_type)
        hub = data.get("current_hub")
        if hub is not None and not isinstance(hub, Hub):
            hub = Hub.objects.get(pk=hub)
        try:
            row = EBoarder.objects.create(
                serial=serial,
                make=(data.get("make") or "Asobo").strip() or "Asobo",
                model=model,
                rated_watts=int(rated),
                petrol_hp_equivalent=(data.get("petrol_hp_equivalent") or "").strip(),
                nominal_voltage_v=int(data.get("nominal_voltage_v") or 48),
                battery_type=battery_type,
                shaft_length=data.get("shaft_length") or EBoarder.ShaftLength.UNKNOWN,
                status=data.get("status") or EBoarder.Status.IN_STOCK,
                current_hub=hub,
                raw=data.get("raw") or {},
            )
        except IntegrityError as exc:
            raise DomainError(
                "VALIDATION",
                "An e-boarder with this serial already exists.",
                http=400,
            ) from exc
        emit_event(
            action="eboarder.created",
            subject_type="eboarder",
            subject_id=str(row.id),
            subject_label=row.serial,
            actor=actor,
            after={
                "serial": row.serial,
                "status": row.status,
                "rated_watts": row.rated_watts,
                "battery_type_id": str(row.battery_type_id),
                "current_hub_id": str(row.current_hub_id) if row.current_hub_id else None,
            },
        )
        return row

    @staticmethod
    @transaction.atomic
    def update(*, eboarder: EBoarder, data: dict, actor=None) -> EBoarder:
        locked = EBoarder.objects.select_for_update().get(pk=eboarder.pk)
        before = {
            "serial": locked.serial,
            "make": locked.make,
            "model": locked.model,
            "status": locked.status,
            "rated_watts": locked.rated_watts,
            "battery_type_id": str(locked.battery_type_id),
            "current_hub_id": str(locked.current_hub_id) if locked.current_hub_id else None,
        }
        for key in (
            "make",
            "model",
            "petrol_hp_equivalent",
            "shaft_length",
            "status",
        ):
            if key in data and data[key] is not None:
                val = data[key]
                setattr(locked, key, val.strip() if isinstance(val, str) else val)
        if "serial" in data and data["serial"] is not None:
            locked.serial = str(data["serial"]).strip().upper()
        if "rated_watts" in data and data["rated_watts"] is not None:
            locked.rated_watts = int(data["rated_watts"])
        if "nominal_voltage_v" in data and data["nominal_voltage_v"] is not None:
            locked.nominal_voltage_v = int(data["nominal_voltage_v"])
        if "battery_type" in data and data["battery_type"] is not None:
            bt = data["battery_type"]
            locked.battery_type = (
                bt if isinstance(bt, BatteryType) else BatteryType.objects.get(pk=bt)
            )
        if "current_hub" in data:
            hub = data["current_hub"]
            if hub is None:
                locked.current_hub = None
            else:
                locked.current_hub = hub if isinstance(hub, Hub) else Hub.objects.get(pk=hub)
        if "raw" in data and data["raw"] is not None:
            locked.raw = data["raw"]
        try:
            locked.save()
        except IntegrityError as exc:
            raise DomainError(
                "VALIDATION",
                "An e-boarder with this serial already exists.",
                http=400,
            ) from exc
        emit_event(
            action="eboarder.updated",
            subject_type="eboarder",
            subject_id=str(locked.id),
            subject_label=locked.serial,
            actor=actor,
            before=before,
            after={
                "serial": locked.serial,
                "make": locked.make,
                "model": locked.model,
                "status": locked.status,
                "rated_watts": locked.rated_watts,
                "battery_type_id": str(locked.battery_type_id),
                "current_hub_id": (
                    str(locked.current_hub_id) if locked.current_hub_id else None
                ),
            },
        )
        return locked

    @staticmethod
    def issue_to_vehicle(
        *,
        eboarder: EBoarder,
        vehicle: Vehicle,
        account: Account,
        actor=None,
    ) -> EBoarder:
        locked = EBoarder.objects.select_for_update().get(pk=eboarder.pk)
        if locked.status != EBoarder.Status.IN_STOCK:
            raise DomainError(
                "EBOARDER_UNAVAILABLE",
                f"E-boarder {locked.serial} is {locked.status}, not in stock.",
                http=409,
            )
        if (
            EBoarder.objects.filter(vehicle_id=vehicle.pk)
            .exclude(pk=locked.pk)
            .exists()
        ):
            raise DomainError(
                "VEHICLE_HAS_EBOARDER",
                "This vehicle already has an e-boarder issued.",
                http=409,
            )
        before = {"status": locked.status, "vehicle_id": None}
        locked.status = EBoarder.Status.ISSUED
        locked.vehicle = vehicle
        locked.account = account
        locked.current_hub = None
        locked.issued_at = timezone.now()
        locked.save(
            update_fields=[
                "status",
                "vehicle",
                "account",
                "current_hub",
                "issued_at",
                "updated_at",
            ]
        )
        emit_event(
            action="eboarder.issued",
            subject_type="eboarder",
            subject_id=str(locked.id),
            subject_label=locked.serial,
            actor=actor,
            before=before,
            after={
                "status": locked.status,
                "vehicle_id": str(vehicle.id),
                "account_id": str(account.id),
            },
        )
        return locked
