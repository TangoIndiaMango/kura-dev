"""StaffMembership hub assignments — authz source for hub_ids_for()."""
from __future__ import annotations

from uuid import UUID

from django.db import transaction
from django.db.models import Q, QuerySet

from accounts.models import StaffMembership, User
from core.exceptions import DomainError
from mobility.models import Hub


def hub_ids_for_user(user: User) -> list[str]:
    """UUID strings from memberships (excludes global '*')."""
    out: list[str] = []
    for hid in StaffMembership.objects.filter(user_id=user.pk).values_list(
        "hub_id", flat=True
    ):
        if not hid or hid == "*":
            continue
        out.append(str(hid))
    return out


def users_for_hub(hub_id: UUID | str) -> QuerySet[User]:
    """Staff on this hub via membership or an open shift (bay on-duty)."""
    from operations.models import Shift

    hid = str(hub_id)
    membership_ids = (
        StaffMembership.objects.filter(hub_id=hid)
        .exclude(hub_id="")
        .values_list("user_id", flat=True)
    )
    shift_ids = Shift.objects.filter(
        hub_id=hid, status=Shift.Status.OPEN
    ).values_list("agent_id", flat=True)
    return User.objects.filter(
        Q(pk__in=membership_ids) | Q(pk__in=shift_ids),
        is_active=True,
    ).distinct()


@transaction.atomic
def set_hub_memberships(
    *,
    user: User,
    hub_ids: list[UUID],
    role_code: str | None = None,
) -> list[str]:
    """
    Replace hub assignments for a station agent.

    Empty list clears membership (agent sees nothing until an open shift).
    Non-empty list scopes hubs / batteries / swaps to those stations only.
    """
    role = (role_code or user.role or "").strip().upper()
    if role != User.Role.HUB_AGENT:
        if hub_ids:
            raise DomainError(
                "VALIDATION_ERROR",
                "hub_ids is only valid for Hub Agent.",
                details={"hub_ids": ["role_mismatch"]},
            )
        return []

    unique: list[UUID] = list(dict.fromkeys(hub_ids))
    if unique:
        found = set(
            Hub.objects.filter(id__in=unique).values_list("id", flat=True)
        )
        missing = [str(h) for h in unique if h not in found]
        if missing:
            raise DomainError(
                "VALIDATION_ERROR",
                "Unknown hub.",
                details={"hub_ids": missing},
            )

    StaffMembership.objects.filter(user_id=user.pk).delete()
    for hid in unique:
        StaffMembership.objects.create(
            user=user,
            role=User.Role.HUB_AGENT,
            hub_id=str(hid),
        )
    return [str(h) for h in unique]
