"""Staff invite + resend (email setup link)."""
from __future__ import annotations

from uuid import UUID

from django.db import transaction

from accounts.helpers.staff import resolve_assignable_staff_role
from accounts.models import Cooperative, User
from accounts.services.memberships import set_hub_memberships
from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event


def _label(user: User) -> str:
    return (
        f"{user.first_name} {user.last_name}".strip()
        or user.email
        or user.phone
        or user.public_id
        or str(user.id)
    )


@transaction.atomic
def invite_staff(
    *,
    actor: User,
    email: str,
    role_code: str,
    first_name: str = "",
    last_name: str = "",
    phone: str = "",
    password: str | None = None,
    cooperative_id: str | None = None,
    hub_ids: list[UUID] | None = None,
) -> tuple[User, dict]:
    from accounts.services.cooperatives import CooperativeService
    from accounts.services.invites import (
        INVITE_TTL,
        enqueue_staff_invite_email,
        issue_password_setup_token,
    )

    _ = password
    email = (email or "").strip().lower()
    if not email:
        raise DomainError(
            "VALIDATION_ERROR",
            "Email is required.",
            details={"email": ["required"]},
        )
    if User.objects.filter(email__iexact=email).exists():
        raise DomainError(
            "VALIDATION_ERROR",
            "A user with this email already exists.",
            details={"email": ["unique"]},
        )

    role_code = (role_code or "").strip().upper()
    assigned = resolve_assignable_staff_role(role_code)
    coop = None
    if cooperative_id:
        coop = Cooperative.objects.filter(pk=cooperative_id).first()
        if coop is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Unknown cooperative.",
                details={"cooperative_id": ["invalid"]},
            )
        if assigned.code != User.Role.COOPERATIVE_CHAIRMAN:
            raise DomainError(
                "VALIDATION_ERROR",
                "cooperative_id is only valid when inviting a Cooperative Chairman.",
                details={"cooperative_id": ["role_mismatch"]},
            )

    if hub_ids and assigned.code != User.Role.HUB_AGENT:
        raise DomainError(
            "VALIDATION_ERROR",
            "hub_ids is only valid when inviting a Hub Agent.",
            details={"hub_ids": ["role_mismatch"]},
        )

    user = User.objects.create(
        email=email,
        phone=(phone or "").strip() or None,
        first_name=(first_name or "").strip(),
        last_name=(last_name or "").strip(),
        role=assigned.code,
        assigned_role=assigned,
        is_staff=True,
        is_active=True,
        is_superuser=assigned.code == User.Role.SUPER_ADMIN,
    )
    user.set_unusable_password()
    user.save()

    if coop is not None:
        CooperativeService.set_chairman(cooperative=coop, user=user, actor=actor)

    assigned_hubs: list[str] = []
    if assigned.code == User.Role.HUB_AGENT and hub_ids is not None:
        assigned_hubs = set_hub_memberships(
            user=user, hub_ids=list(hub_ids), role_code=assigned.code
        )

    _row, raw_token = issue_password_setup_token(user=user)
    enqueue_staff_invite_email(user_id=str(user.id), raw_token=raw_token)
    expires_hours = int(INVITE_TTL.total_seconds() // 3600)

    after: dict = {
        "public_id": user.public_id,
        "email": user.email,
        "role": user.role,
        "invite_email_sent": True,
    }
    if coop is not None:
        after["cooperative_id"] = str(coop.id)
    if assigned_hubs:
        after["hub_ids"] = assigned_hubs

    emit_event(
        action="user.invited",
        subject_type="user",
        subject_id=str(user.id),
        subject_label=user.public_id or _label(user),
        actor=actor,
        after=after,
        notify=NotifySpec(
            user=actor,
            title="Staff invite emailed",
            body=(
                f"{_label(user)} ({user.public_id}) invited as {assigned.code}. "
                f"Setup link expires in {expires_hours}h."
            ),
            source="Users",
            link_path=f"/users/{user.id}",
            template_code="user.invited",
            dedupe_key=f"user.invited:{user.id}",
        ),
    )
    meta: dict = {
        "invite_email_sent": True,
        "expires_hours": expires_hours,
    }
    if coop is not None:
        meta["cooperative_id"] = str(coop.id)
    if assigned_hubs:
        meta["hub_ids"] = assigned_hubs
    return user, meta


@transaction.atomic
def resend_invite(*, user: User, actor: User) -> dict:
    from accounts.services.invites import (
        INVITE_TTL,
        enqueue_staff_invite_email,
        issue_password_setup_token,
    )

    if not user.is_staff:
        raise DomainError(
            "VALIDATION_ERROR",
            "Only staff users can receive console invites.",
            http=400,
        )
    if not user.email:
        raise DomainError(
            "VALIDATION_ERROR",
            "User has no email address.",
            http=400,
        )
    if user.has_usable_password() and user.last_login is not None:
        raise DomainError(
            "VALIDATION_ERROR",
            "This user already activated their account. Use password reset instead.",
            http=409,
        )
    _row, raw_token = issue_password_setup_token(user=user)
    enqueue_staff_invite_email(user_id=str(user.id), raw_token=raw_token)
    expires_hours = int(INVITE_TTL.total_seconds() // 3600)
    emit_event(
        action="user.invite_resent",
        subject_type="user",
        subject_id=str(user.id),
        subject_label=user.public_id or _label(user),
        actor=actor,
        metadata={"expires_hours": expires_hours},
    )
    return {"invite_email_sent": True, "expires_hours": expires_hours}
