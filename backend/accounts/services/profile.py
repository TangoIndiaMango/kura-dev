"""Self-serve profile updates (name, phone, avatar, notification prefs)."""
from __future__ import annotations

from django.db import transaction

from accounts.models import User
from accounts.services.invites import validate_password_strength
from core.exceptions import DomainError
from core.services.events import emit_event
from core.services.media import resolve_owned_asset

DEFAULT_NOTIF_PREFS = {"email": True, "push": True}


def normalized_notif_prefs(raw: dict | None) -> dict[str, bool]:
    base = dict(DEFAULT_NOTIF_PREFS)
    if isinstance(raw, dict):
        if "email" in raw:
            base["email"] = bool(raw["email"])
        if "push" in raw:
            base["push"] = bool(raw["push"])
    return base


@transaction.atomic
def update_own_profile(
    *,
    user: User,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    avatar_asset_id=...,
    notification_prefs: dict | None = None,
) -> User:
    before = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "avatar_id": str(user.avatar_id) if user.avatar_id else None,
        "notification_prefs": normalized_notif_prefs(user.notification_prefs),
    }
    fields: list[str] = []
    if first_name is not None:
        user.first_name = first_name.strip()
        fields.append("first_name")
    if last_name is not None:
        user.last_name = last_name.strip()
        fields.append("last_name")
    if phone is not None:
        user.phone = phone.strip() or None
        fields.append("phone")
    if email is not None:
        cleaned = email.strip() or None
        user.email = cleaned
        fields.append("email")
    if avatar_asset_id is not ...:
        user.avatar = (
            resolve_owned_asset(user=user, asset_id=avatar_asset_id)
            if avatar_asset_id
            else None
        )
        fields.append("avatar")
    if notification_prefs is not None:
        user.notification_prefs = normalized_notif_prefs(
            {**normalized_notif_prefs(user.notification_prefs), **notification_prefs}
        )
        fields.append("notification_prefs")
    if not fields:
        return user
    fields.append("updated_at")
    user.save(update_fields=fields)
    emit_event(
        action="user.profile_updated",
        subject_type="user",
        subject_id=str(user.id),
        subject_label=user.public_id or user.email or user.phone,
        actor=user,
        before=before,
        after={
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "email": user.email,
            "avatar_id": str(user.avatar_id) if user.avatar_id else None,
            "notification_prefs": normalized_notif_prefs(user.notification_prefs),
        },
    )
    return user


@transaction.atomic
def change_own_password(
    *,
    user: User,
    current_password: str,
    new_password: str,
    new_password_confirmation: str,
) -> User:
    if not user.has_usable_password() or not user.check_password(current_password):
        raise DomainError(
            "AUTH_INVALID",
            "Current password is incorrect.",
            http=400,
            details={"current_password": ["incorrect"]},
        )
    if (new_password or "") != (new_password_confirmation or ""):
        raise DomainError(
            "VALIDATION_ERROR",
            "Password confirmation does not match.",
            details={"new_password_confirmation": ["Must match new password."]},
            http=400,
        )
    if user.check_password(new_password):
        raise DomainError(
            "VALIDATION_ERROR",
            "New password must be different from the current password.",
            details={"new_password": ["reuse"]},
            http=400,
        )
    validate_password_strength(new_password)
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
    emit_event(
        action="user.password_changed",
        subject_type="user",
        subject_id=str(user.id),
        subject_label=user.public_id or user.email or user.phone,
        actor=user,
        metadata={"self_serve": True},
    )
    return user
