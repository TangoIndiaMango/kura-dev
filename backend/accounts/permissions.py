"""DRF permission classes — capability-gated, role-extensible."""
from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.capabilities import capabilities_for_role_code


def user_capability_set(user) -> set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    if getattr(user, "is_superuser", False) or getattr(user, "role", None) == "SUPER_ADMIN":
        return capabilities_for_role_code("SUPER_ADMIN")
    assigned = getattr(user, "assigned_role", None)
    if assigned is not None:
        if not getattr(assigned, "is_active", True):
            return set()
        # Prefer DB grants (custom roles) when present
        codes = set(assigned.permissions.values_list("code", flat=True))
        if codes:
            return codes
        return capabilities_for_role_code(assigned.code)
    return capabilities_for_role_code(getattr(user, "role", "") or "")


def user_has_capability(user, code: str) -> bool:
    return code in user_capability_set(user)


def _matches_required(user, required: str | list[str] | tuple[str, ...] | None) -> bool:
    if required is None:
        return True
    if isinstance(required, (list, tuple)):
        return any(user_has_capability(user, code) for code in required)
    return user_has_capability(user, required)


class HasCapability(BasePermission):
    """
    Usage on a view / ViewSet:
        permission_classes = [IsAuthenticated, HasCapability]
        required_capability = "accounts:manage"
        # or per-action (str or list of any-of codes):
        capability_map = {"list": "accounts:read", "create": ["cases:manage", "cases:write_own"]}
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        capability_map = getattr(view, "capability_map", None) or {}
        action = getattr(view, "action", None)
        required = None
        if action and action in capability_map:
            required = capability_map[action]
        if required is None:
            required = getattr(view, "required_capability", None)
        return _matches_required(user, required)


class HasCapabilityOrReadOwn(BasePermission):
    """List/retrieve own rows without accounts:read; mutations need mapped capability."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        capability_map = getattr(view, "capability_map", {}) or {}
        action = getattr(view, "action", None)
        required = capability_map.get(action) or getattr(view, "required_capability", None)
        return _matches_required(request.user, required)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user_has_capability(user, "accounts:manage") or user_has_capability(user, "accounts:read"):
            return True
        owner = getattr(obj, "owner_user_id", None)
        if owner is not None:
            return owner == user.id
        account = getattr(obj, "account", None)
        if account is not None:
            return account.owner_user_id == user.id
        return False
