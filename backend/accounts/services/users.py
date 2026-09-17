"""Staff user directory — activate / deactivate / update."""
from __future__ import annotations

from uuid import UUID

from django.db import transaction

from accounts.helpers.staff import resolve_assignable_staff_role
from accounts.models import User
from accounts.services.memberships import set_hub_memberships
from accounts.services.staff_invite import invite_staff, resend_invite
from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event


def staff_users_qs():
    """Console staff directory — is_staff users (includes custom roles)."""
    return (
        User.objects.filter(is_staff=True)
        .select_related("assigned_role")
        .order_by("-created_at")
    )


def _label(user: User) -> str:
    return (
        f"{user.first_name} {user.last_name}".strip()
        or user.email
        or user.phone
        or user.public_id
        or str(user.id)
    )


class UserService:
    invite_staff = staticmethod(invite_staff)
    resend_invite = staticmethod(resend_invite)

    @staticmethod
    @transaction.atomic
    def set_active(*, user: User, actor: User, is_active: bool) -> User:
        user = User.objects.select_for_update().get(pk=user.pk)
        if user.id == actor.id and not is_active:
            raise DomainError(
                "VALIDATION_ERROR",
                "You cannot deactivate your own account.",
                http=400,
            )
        if not user.is_staff:
            raise DomainError(
                "VALIDATION_ERROR",
                "Only staff users can be managed here.",
                http=400,
            )
        before = {"is_active": user.is_active}
        user.is_active = is_active
        if not is_active:
            user.session_version += 1
        user.save(update_fields=["is_active", "session_version", "updated_at"])
        action = "user.activated" if is_active else "user.deactivated"
        emit_event(
            action=action,
            subject_type="user",
            subject_id=str(user.id),
            subject_label=user.public_id or _label(user),
            actor=actor,
            before=before,
            after={"is_active": user.is_active},
            notify=NotifySpec(
                user=user,
                title="User activated" if is_active else "User deactivated",
                body=f"{_label(user)} ({user.public_id}) is now "
                f"{'active' if is_active else 'suspended'}.",
                source="Users",
                link_path=f"/users/{user.id}",
                template_code=action,
                dedupe_key=f"{action}:{user.id}:{int(is_active)}",
            ),
        )
        return user

    @staticmethod
    @transaction.atomic
    def update_staff(
        *,
        user: User,
        actor: User,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        role_code: str | None = None,
        is_active: bool | None = None,
        hub_ids: list[UUID] | None = None,
    ) -> User:
        user = User.objects.select_for_update().get(pk=user.pk)
        if not user.is_staff:
            raise DomainError(
                "VALIDATION_ERROR",
                "Only staff users can be managed here.",
                http=400,
            )
        before = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
        }
        updates = ["updated_at"]
        if first_name is not None:
            user.first_name = first_name.strip()
            updates.append("first_name")
        if last_name is not None:
            user.last_name = last_name.strip()
            updates.append("last_name")
        if phone is not None:
            user.phone = phone.strip() or None
            updates.append("phone")
        if role_code is not None:
            assigned = resolve_assignable_staff_role(role_code)
            if user.id == actor.id and assigned.code != user.role:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "You cannot change your own role.",
                    http=400,
                )
            user.role = assigned.code
            user.assigned_role = assigned
            user.is_superuser = assigned.code == User.Role.SUPER_ADMIN
            updates.extend(["role", "assigned_role", "is_superuser"])
        if is_active is not None:
            if user.id == actor.id and not is_active:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "You cannot deactivate your own account.",
                    http=400,
                )
            user.is_active = is_active
            updates.append("is_active")
        role_changed = before["role"] != user.role
        deactivated = before["is_active"] and not user.is_active
        if role_changed or deactivated:
            user.session_version += 1
            updates.append("session_version")
        user.save(update_fields=list(dict.fromkeys(updates)))

        after_hubs: list[str] | None = None
        if hub_ids is not None:
            after_hubs = set_hub_memberships(
                user=user, hub_ids=list(hub_ids), role_code=user.role
            )

        after = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
        }
        if after_hubs is not None:
            after["hub_ids"] = after_hubs
        emit_event(
            action="user.updated",
            subject_type="user",
            subject_id=str(user.id),
            subject_label=user.public_id or _label(user),
            actor=actor,
            before=before,
            after=after,
            notify=(
                NotifySpec(
                    user=user,
                    title="Role changed",
                    body=f"{_label(user)} ({user.public_id}): "
                    f"{before['role']} → {after['role']}.",
                    source="Users",
                    link_path=f"/users/{user.id}",
                    template_code="user.role_changed",
                    dedupe_key=f"user.role_changed:{user.id}:{after['role']}",
                )
                if role_changed
                else None
            ),
        )
        return user
