"""Petrol engine custody — release request + ops release."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import PetrolEngine
from support.models import SupportCase
from support.services import SupportCaseService


class EngineCustodyService:
    @staticmethod
    @transaction.atomic
    def request_release(*, engine: PetrolEngine, actor=None, note: str = "") -> PetrolEngine:
        locked = (
            PetrolEngine.objects.select_for_update()
            .select_related("account")
            .get(pk=engine.pk)
        )
        if locked.status != PetrolEngine.Status.STORED:
            raise DomainError(
                "INVALID_STATE",
                f"Only STORED engines can request release; is {locked.status}.",
                http=409,
            )
        before = locked.status
        locked.status = PetrolEngine.Status.RELEASE_REQUESTED
        locked.save(update_fields=["status", "updated_at"])

        body = (
            f"Engine release requested for tag {locked.tag}. "
            f"{(note or '').strip()}"
        ).strip()
        case = SupportCaseService.open_case(
            account=locked.account,
            subject=f"Engine release — {locked.tag}",
            kind=SupportCase.Kind.ENGINE_RELEASE,
            priority=SupportCase.Priority.NORMAL,
            opened_by=actor,
            body=body,
        )
        locked.raw = {
            **(locked.raw or {}),
            "release_case_id": str(case.id),
            "release_case_code": case.code,
        }
        locked.save(update_fields=["raw", "updated_at"])

        notify = None
        owner = getattr(locked.account, "owner_user", None)
        if owner is not None:
            notify = NotifySpec(
                user=owner,
                title="Engine release requested",
                body=f"{locked.tag} — support case {case.code}",
                source="Engines",
                link_path="/support",
                template_code="engine.release_requested",
                dedupe_key=f"engine-release-req:{locked.id}",
            )
        emit_event(
            action="engine.release_requested",
            subject_type="petrol_engine",
            subject_id=str(locked.id),
            subject_label=locked.tag,
            actor=actor,
            before={"status": before},
            after={
                "status": locked.status,
                "case_id": str(case.id),
                "case_code": case.code,
            },
            notify=notify,
        )
        return locked

    @staticmethod
    @transaction.atomic
    def release(*, engine: PetrolEngine, data: dict, actor=None) -> PetrolEngine:
        locked = PetrolEngine.objects.select_for_update().get(pk=engine.pk)
        if locked.status != PetrolEngine.Status.RELEASE_REQUESTED:
            raise DomainError(
                "INVALID_STATE",
                "Engine must be RELEASE_REQUESTED before release.",
                http=409,
            )
        photos = list(data.get("photo_asset_ids") or [])
        if not photos:
            raise DomainError(
                "VALIDATION",
                "Release photos are required.",
                http=400,
            )
        signature = (data.get("signature_asset_id") or "").strip()
        if not signature:
            raise DomainError(
                "VALIDATION",
                "Release signature is required.",
                http=400,
            )
        before = locked.status
        locked.status = PetrolEngine.Status.RELEASED
        locked.released_at = timezone.now()
        locked.release_photos = photos
        locked.release_signature = signature
        locked.release_by = actor
        locked.save(
            update_fields=[
                "status",
                "released_at",
                "release_photos",
                "release_signature",
                "release_by",
                "updated_at",
            ]
        )
        emit_event(
            action="engine.released",
            subject_type="petrol_engine",
            subject_id=str(locked.id),
            subject_label=locked.tag,
            actor=actor,
            before={"status": before},
            after={
                "status": locked.status,
                "released_at": locked.released_at.isoformat(),
                "release_by_id": str(actor.id) if actor else None,
            },
        )
        return locked
