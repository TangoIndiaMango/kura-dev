"""Staff hub scope — StaffMembership is the authz source; open shifts are fallback."""
from __future__ import annotations

from uuid import UUID

from django.db.models import Q

from accounts.models import StaffMembership, User
from accounts.permissions import user_has_capability
from operations.models import Shift


def hub_ids_for(user: User) -> list[UUID] | None:
    """
    Hub scope for staff querysets.

    Returns:
      None — unrestricted (network ops / global membership)
      [] — station agent with no hubs assigned
      [uuid, ...] — filter to these hubs
    """
    if not getattr(user, "is_authenticated", False):
        return []
    if getattr(user, "is_superuser", False):
        return None
    if user_has_capability(user, "hubs:manage"):
        return None

    rows = list(
        StaffMembership.objects.filter(user_id=user.pk).values_list(
            "hub_id", flat=True
        )
    )
    if rows:
        if any(hid == "*" for hid in rows):
            return None
        out: list[UUID] = []
        for hid in rows:
            if not hid or hid == "*":
                continue
            try:
                out.append(UUID(str(hid)))
            except ValueError:
                continue
        return out

    shift_hubs = list(
        Shift.objects.filter(
            agent_id=user.pk, status=Shift.Status.OPEN
        ).values_list("hub_id", flat=True)
    )
    if shift_hubs:
        return list(shift_hubs)

    role = getattr(user, "role", "") or ""
    if role == User.Role.HUB_AGENT:
        return []
    return None


def account_ids_touching_hubs(hub_ids: list[UUID]) -> list:
    """Accounts that swapped, reserved, or have a pack at these hubs."""
    from mobility.models import Reservation, Swap, Vehicle

    if not hub_ids:
        return []
    ids: set = set()
    ids.update(
        Swap.objects.filter(hub_id__in=hub_ids, account_id__isnull=False).values_list(
            "account_id", flat=True
        )
    )
    ids.update(
        Reservation.objects.filter(
            hub_id__in=hub_ids, account_id__isnull=False
        ).values_list("account_id", flat=True)
    )
    ids.update(
        Vehicle.objects.filter(
            current_battery__current_hub_id__in=hub_ids, account_id__isnull=False
        ).values_list("account_id", flat=True)
    )
    return [i for i in ids if i]


def vehicle_q_for_hubs(hub_ids: list[UUID]) -> Q:
    """Vehicles mounted at hub or that have swapped at hub."""
    from mobility.models import Swap

    if not hub_ids:
        return Q(pk__in=[])
    swapped = Swap.objects.filter(hub_id__in=hub_ids).values("vehicle_id")
    return Q(current_battery__current_hub_id__in=hub_ids) | Q(id__in=swapped)
