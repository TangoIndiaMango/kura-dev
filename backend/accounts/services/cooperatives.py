"""Thin cooperative catalogue (not people management)."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account, Cooperative, User
from core.exceptions import DomainError
from core.services.events import emit_event


class CooperativeService:
    @staticmethod
    @transaction.atomic
    def create(
        *,
        name: str,
        region: str = "",
        actor: User | None = None,
    ) -> Cooperative:
        name = (name or "").strip()
        if not name:
            raise DomainError(
                "VALIDATION_ERROR",
                "Cooperative name is required.",
                details={"name": ["required"]},
            )
        coop = Cooperative.objects.create(
            name=name,
            region=(region or "").strip(),
            status=Cooperative.Status.ACTIVE,
        )
        emit_event(
            action="cooperative.created",
            subject_type="cooperative",
            subject_id=str(coop.id),
            subject_label=coop.name,
            actor=actor,
            after={"name": coop.name, "region": coop.region, "status": coop.status},
        )
        return coop

    @staticmethod
    @transaction.atomic
    def update(
        *,
        cooperative: Cooperative,
        data: dict,
        actor: User | None = None,
    ) -> Cooperative:
        locked = Cooperative.objects.select_for_update().get(pk=cooperative.pk)
        before = {
            "name": locked.name,
            "region": locked.region,
            "status": locked.status,
        }
        if "name" in data and data["name"] is not None:
            name = str(data["name"]).strip()
            if not name:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "Cooperative name is required.",
                    details={"name": ["required"]},
                )
            locked.name = name
        if "region" in data and data["region"] is not None:
            locked.region = str(data["region"]).strip()
        if "status" in data and data["status"]:
            locked.status = data["status"]
        locked.save()
        emit_event(
            action="cooperative.updated",
            subject_type="cooperative",
            subject_id=str(locked.id),
            subject_label=locked.name,
            actor=actor,
            before=before,
            after={
                "name": locked.name,
                "region": locked.region,
                "status": locked.status,
            },
        )
        return locked

    @staticmethod
    @transaction.atomic
    def set_chairman(
        *,
        cooperative: Cooperative,
        user: User,
        actor: User | None = None,
    ) -> Cooperative:
        locked = Cooperative.objects.select_for_update().get(pk=cooperative.pk)
        before = {"chairman_user_id": str(locked.chairman_user_id or "")}
        locked.chairman_user = user
        locked.save(update_fields=["chairman_user", "updated_at"])
        emit_event(
            action="cooperative.chairman_assigned",
            subject_type="cooperative",
            subject_id=str(locked.id),
            subject_label=locked.name,
            actor=actor,
            before=before,
            after={"chairman_user_id": str(user.id)},
        )
        return locked

    @staticmethod
    @transaction.atomic
    def assign_account(
        *,
        account: Account,
        cooperative: Cooperative | None,
        actor: User,
    ) -> Account:
        locked = Account.objects.select_for_update().get(pk=account.pk)
        before = {"cooperative_id": str(locked.cooperative_id or "")}
        locked.cooperative = cooperative
        locked.save(update_fields=["cooperative", "updated_at"])
        emit_event(
            action="account.cooperative_assigned",
            subject_type="account",
            subject_id=str(locked.id),
            subject_label=locked.kura_id or locked.display_name,
            actor=actor,
            before=before,
            after={"cooperative_id": str(locked.cooperative_id or "")},
        )
        return locked
