"""Vehicle model catalogue mutations."""
from __future__ import annotations

from django.db import IntegrityError, transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import BatteryType, VehicleModel, VehicleType


class VehicleModelService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> VehicleModel:
        make = (data.get("make") or "").strip()
        model = (data.get("model") or "").strip()
        if not make or not model:
            raise DomainError("VALIDATION_ERROR", "make and model are required.")
        battery_type = data.get("battery_type")
        if battery_type is None:
            raise DomainError("VALIDATION_ERROR", "battery_type is required.")
        if not isinstance(battery_type, BatteryType):
            battery_type = BatteryType.objects.get(pk=battery_type)
        try:
            row = VehicleModel.objects.create(
                make=make,
                model=model,
                vehicle_type=data.get("vehicle_type") or VehicleType.MOTORCYCLE,
                battery_type=battery_type,
                service_interval_km=data.get("service_interval_km"),
                service_interval_days=data.get("service_interval_days"),
            )
        except IntegrityError as exc:
            raise DomainError(
                "VALIDATION_ERROR",
                "A catalogue model with this make and model already exists.",
                http=400,
            ) from exc
        emit_event(
            action="vehicle_model.created",
            subject_type="vehicle_model",
            subject_id=str(row.id),
            subject_label=f"{row.make} {row.model}",
            actor=actor,
            after={
                "make": row.make,
                "model": row.model,
                "vehicle_type": row.vehicle_type,
                "battery_type_id": str(row.battery_type_id),
            },
        )
        return row

    @staticmethod
    @transaction.atomic
    def update(*, vehicle_model: VehicleModel, data: dict, actor=None) -> VehicleModel:
        locked = VehicleModel.objects.select_for_update().get(pk=vehicle_model.pk)
        before = {
            "make": locked.make,
            "model": locked.model,
            "vehicle_type": locked.vehicle_type,
            "battery_type_id": str(locked.battery_type_id),
            "service_interval_km": locked.service_interval_km,
            "service_interval_days": locked.service_interval_days,
        }
        if "make" in data and data["make"] is not None:
            locked.make = str(data["make"]).strip()
        if "model" in data and data["model"] is not None:
            locked.model = str(data["model"]).strip()
        if "vehicle_type" in data and data["vehicle_type"]:
            locked.vehicle_type = data["vehicle_type"]
        if "battery_type" in data and data["battery_type"] is not None:
            bt = data["battery_type"]
            locked.battery_type = (
                bt if isinstance(bt, BatteryType) else BatteryType.objects.get(pk=bt)
            )
        if "service_interval_km" in data:
            locked.service_interval_km = data["service_interval_km"]
        if "service_interval_days" in data:
            locked.service_interval_days = data["service_interval_days"]
        try:
            locked.save()
        except IntegrityError as exc:
            raise DomainError(
                "VALIDATION_ERROR",
                "A catalogue model with this make and model already exists.",
                http=400,
            ) from exc
        emit_event(
            action="vehicle_model.updated",
            subject_type="vehicle_model",
            subject_id=str(locked.id),
            subject_label=f"{locked.make} {locked.model}",
            actor=actor,
            before=before,
            after={
                "make": locked.make,
                "model": locked.model,
                "vehicle_type": locked.vehicle_type,
                "battery_type_id": str(locked.battery_type_id),
                "service_interval_km": locked.service_interval_km,
                "service_interval_days": locked.service_interval_days,
            },
        )
        return locked
