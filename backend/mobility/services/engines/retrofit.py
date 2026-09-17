"""Path B retrofit wizard mutations (intake → install → checklist → activate)."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from accounts.models import Account
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import (
    DEFAULT_SAFETY_CHECKLIST,
    Hub,
    PetrolEngine,
    Retrofit,
    Vehicle,
)

User = get_user_model()


def _lock_retrofit(retrofit_id) -> Retrofit:
    return (
        Retrofit.objects.select_for_update()
        .select_related("account", "vehicle")
        .get(pk=retrofit_id)
    )


def _require_status(locked: Retrofit, allowed: set[str]) -> None:
    if locked.status not in allowed:
        raise DomainError(
            "INVALID_STATE",
            f"Retrofit must be in {sorted(allowed)}; is {locked.status}.",
            http=409,
        )


class RetrofitService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> Retrofit:
        account = Account.objects.select_for_update().get(pk=data["account_id"])
        vehicle = Vehicle.objects.select_for_update().get(pk=data["vehicle_id"])
        if vehicle.account_id != account.id:
            raise DomainError(
                "VALIDATION",
                "Vehicle does not belong to this account.",
                http=400,
            )
        # Path is per vehicle — never flip the whole account (multi-vehicle Path A + Path B).
        if vehicle.acquisition_path != Vehicle.AcquisitionPath.ENGINE_SWAP:
            vehicle.acquisition_path = Vehicle.AcquisitionPath.ENGINE_SWAP
            vehicle.save(update_fields=["acquisition_path", "updated_at"])

        retrofit = Retrofit.objects.create(
            account=account,
            vehicle=vehicle,
            eboarder_serial=(data.get("eboarder_serial") or "").strip(),
            agent=actor,
            checklist=dict(DEFAULT_SAFETY_CHECKLIST),
            status=Retrofit.Status.INTAKE,
            raw=dict(data.get("raw") or {}),
        )
        emit_event(
            action="retrofit.created",
            subject_type="retrofit",
            subject_id=str(retrofit.id),
            subject_label=vehicle.registration_plate,
            actor=actor,
            after={
                "status": retrofit.status,
                "account_id": str(account.id),
                "vehicle_id": str(vehicle.id),
            },
        )
        return retrofit

    @staticmethod
    @transaction.atomic
    def engine_intake(*, retrofit: Retrofit, data: dict, actor=None) -> Retrofit:
        locked = _lock_retrofit(retrofit.pk)
        _require_status(locked, {Retrofit.Status.INTAKE})
        if locked.petrol_engine_id:
            raise DomainError(
                "ALREADY_INTAKEN",
                "This retrofit already has a petrol engine linked.",
                http=409,
            )
        if actor is None:
            raise DomainError("VALIDATION", "Intake agent is required.", http=400)

        witness_id = data.get("witness_user_id")
        if not witness_id:
            raise DomainError("VALIDATION", "witness_user_id is required.", http=400)
        if str(witness_id) == str(actor.id):
            raise DomainError(
                "VALIDATION",
                "Intake agent and witness must be different staff.",
                http=400,
            )
        try:
            witness = User.objects.get(pk=witness_id)
        except User.DoesNotExist as exc:
            raise DomainError("VALIDATION", "Unknown witness user.", http=400) from exc

        photos = list(data.get("photo_asset_ids") or [])
        if not photos:
            raise DomainError(
                "VALIDATION",
                "At least one intake photo is required (dispute record).",
                http=400,
            )
        signature = (data.get("signature_asset_id") or "").strip()
        if not signature:
            raise DomainError("VALIDATION", "signature_asset_id is required.", http=400)

        tag = (data.get("tag") or "").strip().upper()
        if not tag:
            raise DomainError("VALIDATION", "Engine tag is required.", http=400)
        if PetrolEngine.objects.filter(tag=tag).exists():
            raise DomainError("DUPLICATE", "Engine tag already exists.", http=409)

        hub = None
        hub_id = data.get("storage_hub_id")
        if hub_id:
            hub = Hub.objects.get(pk=hub_id)

        grade = data.get("condition_grade") or PetrolEngine.ConditionGrade.UNKNOWN
        if grade not in PetrolEngine.ConditionGrade.values:
            raise DomainError("VALIDATION", "Invalid condition_grade.", http=400)

        engine = PetrolEngine.objects.create(
            account=locked.account,
            tag=tag,
            make=(data.get("make") or "").strip(),
            model=(data.get("model") or "").strip(),
            hp=(data.get("hp") or "").strip(),
            condition_grade=grade,
            intake_photos=photos,
            intake_agent=actor,
            intake_witness=witness,
            storage_hub=hub,
            status=PetrolEngine.Status.STORED,
            intake_signature=signature,
            raw=dict(data.get("raw") or {}),
        )
        locked.petrol_engine = engine
        locked.agent = actor
        locked.save(update_fields=["petrol_engine", "agent", "updated_at"])

        vehicle = Vehicle.objects.select_for_update().get(pk=locked.vehicle_id)
        vehicle.petrol_engine = engine
        vehicle.acquisition_path = Vehicle.AcquisitionPath.ENGINE_SWAP
        vehicle.save(update_fields=["petrol_engine", "acquisition_path", "updated_at"])

        emit_event(
            action="engine.intake",
            subject_type="petrol_engine",
            subject_id=str(engine.id),
            subject_label=engine.tag,
            actor=actor,
            after={
                "tag": engine.tag,
                "status": engine.status,
                "retrofit_id": str(locked.id),
                "witness_user_id": str(witness.id),
                "storage_hub_id": str(hub.id) if hub else None,
            },
        )
        return locked

    @staticmethod
    @transaction.atomic
    def install(*, retrofit: Retrofit, data: dict, actor=None) -> Retrofit:
        locked = _lock_retrofit(retrofit.pk)
        _require_status(locked, {Retrofit.Status.INTAKE})
        if not locked.petrol_engine_id:
            raise DomainError(
                "MISSING_ENGINE",
                "Complete engine intake before install.",
                http=409,
            )
        serial = (data.get("eboarder_serial") or locked.eboarder_serial or "").strip()
        eboarder_id = data.get("eboarder_id")
        eboarder = None
        if eboarder_id:
            from mobility.models import EBoarder
            from mobility.services.engines.eboarders import EBoarderService

            eboarder = EBoarder.objects.select_for_update().get(pk=eboarder_id)
            serial = eboarder.serial
            EBoarderService.issue_to_vehicle(
                eboarder=eboarder,
                vehicle=locked.vehicle,
                account=locked.account,
                actor=actor,
            )
        elif serial:
            from mobility.models import EBoarder

            eboarder = (
                EBoarder.objects.select_for_update()
                .filter(serial__iexact=serial)
                .first()
            )
            if eboarder:
                from mobility.services.engines.eboarders import EBoarderService

                EBoarderService.issue_to_vehicle(
                    eboarder=eboarder,
                    vehicle=locked.vehicle,
                    account=locked.account,
                    actor=actor,
                )
                serial = eboarder.serial
        if not serial:
            raise DomainError(
                "VALIDATION",
                "eboarder_id or eboarder_serial is required.",
                http=400,
            )
        photos = list(data.get("photo_asset_ids") or locked.photos or [])
        before = locked.status
        locked.eboarder_serial = serial
        locked.eboarder = eboarder
        locked.photos = photos
        locked.status = Retrofit.Status.INSTALLED
        if actor is not None:
            locked.agent = actor
        locked.save(
            update_fields=[
                "eboarder_serial",
                "eboarder",
                "photos",
                "status",
                "agent",
                "updated_at",
            ]
        )
        emit_event(
            action="retrofit.installed",
            subject_type="retrofit",
            subject_id=str(locked.id),
            subject_label=serial,
            actor=actor,
            before={"status": before},
            after={
                "status": locked.status,
                "eboarder_serial": serial,
                "eboarder_id": str(eboarder.id) if eboarder else None,
            },
        )
        return locked

    @staticmethod
    @transaction.atomic
    def checklist(*, retrofit: Retrofit, data: dict, actor=None) -> Retrofit:
        locked = _lock_retrofit(retrofit.pk)
        _require_status(
            locked, {Retrofit.Status.INSTALLED, Retrofit.Status.CHECKED}
        )
        checks = {**DEFAULT_SAFETY_CHECKLIST}
        incoming = data.get("checklist") or {}
        for key in DEFAULT_SAFETY_CHECKLIST:
            if key in incoming:
                checks[key] = bool(incoming[key])
        locked.checklist = checks
        before = locked.status
        all_pass = all(checks.values())
        if all_pass:
            locked.status = Retrofit.Status.CHECKED
            reason = ""
        else:
            locked.status = Retrofit.Status.FAILED
            reason = (data.get("failure_reason") or "Safety checklist item failed.").strip()
            locked.raw = {**(locked.raw or {}), "failure_reason": reason}
        locked.save(update_fields=["checklist", "status", "raw", "updated_at"])
        emit_event(
            action="retrofit.checklist",
            subject_type="retrofit",
            subject_id=str(locked.id),
            subject_label=locked.eboarder_serial or str(locked.id),
            actor=actor,
            before={"status": before},
            after={"status": locked.status, "checklist": checks, "failure_reason": reason},
        )
        return locked

    @staticmethod
    @transaction.atomic
    def activate(*, retrofit: Retrofit, actor=None) -> Retrofit:
        locked = _lock_retrofit(retrofit.pk)
        _require_status(locked, {Retrofit.Status.CHECKED})
        if not locked.checklist_all_passed():
            raise DomainError(
                "CHECKLIST_INCOMPLETE",
                "All six safety checks must pass before activation.",
                http=409,
            )
        before = locked.status
        locked.status = Retrofit.Status.ACTIVATED
        locked.activated_at = timezone.now()
        locked.save(update_fields=["status", "activated_at", "updated_at"])
        emit_event(
            action="retrofit.activated",
            subject_type="retrofit",
            subject_id=str(locked.id),
            subject_label=locked.eboarder_serial or str(locked.id),
            actor=actor,
            before={"status": before},
            after={"status": locked.status, "activated_at": locked.activated_at.isoformat()},
        )
        return locked
