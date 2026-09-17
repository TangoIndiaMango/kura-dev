"""Vehicle register / status mutations with audit."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account, User
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Vehicle, VehicleModel


class VehicleService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> Vehicle:
        model = VehicleModel.objects.get(pk=data["vehicle_model_id"])
        plate = (data.get("registration_plate") or "").strip().upper()
        if not plate:
            raise DomainError("VALIDATION", "Registration plate is required.", http=400)
        if Vehicle.objects.filter(registration_plate=plate).exists():
            raise DomainError(
                "DUPLICATE",
                "A vehicle with this registration already exists.",
                http=409,
            )
        hardware_id = (data.get("hardware_id") or "").strip().upper() or None
        if hardware_id and Vehicle.objects.filter(hardware_id=hardware_id).exists():
            raise DomainError(
                "DUPLICATE",
                "Another vehicle already uses this hardware ID.",
                http=409,
            )
        vehicle = Vehicle.objects.create(
            account_id=data["account_id"],
            vehicle_model=model,
            registration_plate=plate,
            status=data.get("status") or Vehicle.Status.ACTIVE,
            hardware_id=hardware_id,
            vin=(data.get("vin") or "").strip().upper(),
        )
        if (
            actor is not None
            and actor.onboarding_step == User.OnboardingStep.VEHICLE
            and Account.objects.filter(
                pk=vehicle.account_id,
                owner_user_id=actor.pk,
            ).exists()
        ):
            actor.onboarding_step = User.OnboardingStep.PLAN
            actor.save(update_fields=["onboarding_step", "updated_at"])
        emit_event(
            action="vehicle.created",
            subject_type="vehicle",
            subject_id=str(vehicle.id),
            subject_label=vehicle.registration_plate,
            actor=actor,
            after={
                "registration_plate": vehicle.registration_plate,
                "account_id": str(vehicle.account_id),
                "status": vehicle.status,
                "hardware_id": vehicle.hardware_id,
                "onboarding_step": getattr(actor, "onboarding_step", None),
            },
        )
        return vehicle

    @staticmethod
    @transaction.atomic
    def update(*, vehicle: Vehicle, data: dict, actor=None) -> Vehicle:
        locked = Vehicle.objects.select_for_update().get(pk=vehicle.pk)
        before = {
            "registration_plate": locked.registration_plate,
            "status": locked.status,
            "vehicle_model_id": str(locked.vehicle_model_id),
        }
        if "registration_plate" in data and data["registration_plate"]:
            plate = str(data["registration_plate"]).strip().upper()
            clash = (
                Vehicle.objects.filter(registration_plate=plate)
                .exclude(pk=locked.pk)
                .exists()
            )
            if clash:
                raise DomainError(
                    "DUPLICATE",
                    "A vehicle with this registration already exists.",
                    http=409,
                )
            locked.registration_plate = plate
        if "vehicle_model_id" in data and data["vehicle_model_id"]:
            locked.vehicle_model = VehicleModel.objects.get(pk=data["vehicle_model_id"])
        if "account_id" in data and data["account_id"]:
            locked.account_id = data["account_id"]
        if "status" in data and data["status"]:
            locked.status = data["status"]
        if "hardware_id" in data:
            hid = (data.get("hardware_id") or "").strip() or None
            if hid:
                clash = (
                    Vehicle.objects.filter(hardware_id=hid)
                    .exclude(pk=locked.pk)
                    .exists()
                )
                if clash:
                    raise DomainError(
                        "DUPLICATE",
                        "Another vehicle already uses this hardware_id.",
                        http=409,
                    )
            locked.hardware_id = hid
        if "vin" in data:
            locked.vin = (data.get("vin") or "").strip().upper()
        locked.save()
        emit_event(
            action="vehicle.updated",
            subject_type="vehicle",
            subject_id=str(locked.id),
            subject_label=locked.registration_plate,
            actor=actor,
            before=before,
            after={
                "registration_plate": locked.registration_plate,
                "status": locked.status,
                "vehicle_model_id": str(locked.vehicle_model_id),
            },
        )
        return locked

    @staticmethod
    @transaction.atomic
    def set_status(*, vehicle: Vehicle, status: str, actor=None) -> Vehicle:
        locked = Vehicle.objects.select_for_update().get(pk=vehicle.pk)
        before = locked.status
        if status not in Vehicle.Status.values:
            raise DomainError("VALIDATION", "Invalid vehicle status.", http=400)
        locked.status = status
        locked.save(update_fields=["status", "updated_at"])
        emit_event(
            action="vehicle.status_changed",
            subject_type="vehicle",
            subject_id=str(locked.id),
            subject_label=locked.registration_plate,
            actor=actor,
            before={"status": before},
            after={"status": locked.status},
        )
        return locked

    @staticmethod
    @transaction.atomic
    def retire(*, vehicle: Vehicle, actor=None, note: str = "") -> Vehicle:
        locked = (
            Vehicle.objects.select_for_update()
            .select_related("account")
            .get(pk=vehicle.pk)
        )
        if locked.current_battery_id:
            raise DomainError(
                "VEHICLE_HAS_BATTERY",
                "Remove or return the mounted pack before retiring this vehicle.",
                http=409,
            )
        before = locked.status
        locked.status = Vehicle.Status.RETIRED
        locked.save(update_fields=["status", "updated_at"])
        from mobility.models import Subscription
        from mobility.services.plans.subscriptions import SubscriptionService

        active = (
            Subscription.objects.select_for_update()
            .filter(vehicle=locked, status=Subscription.Status.ACTIVE)
            .first()
        )
        if active is not None:
            # Cancel plan; any remaining-value credit is ops-approved, not automatic.
            SubscriptionService.cancel(
                subscription=active,
                actor=actor,
                reason="vehicle_retired",
            )
        emit_event(
            action="vehicle.retired",
            subject_type="vehicle",
            subject_id=str(locked.id),
            subject_label=locked.registration_plate,
            actor=actor,
            before={"status": before},
            after={"status": locked.status},
            metadata={"note": (note or "").strip()[:400]},
        )
        return locked
