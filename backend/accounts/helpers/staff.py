"""Small pure helpers for accounts staff / RBAC assignment."""
from __future__ import annotations

from accounts.models import Role, User
from core.exceptions import DomainError

STAFF_ROLES = frozenset(
    {
        User.Role.SUPER_ADMIN,
        User.Role.OPS_MANAGER,
        User.Role.HUB_AGENT,
        User.Role.COMMERCIAL_ADMIN,
        User.Role.GOVERNMENT_VIEWER,
        User.Role.PARTNER_VIEWER,
        User.Role.COOPERATIVE_CHAIRMAN,
    }
)

OPERATOR_ROLES = frozenset(
    {
        User.Role.DRIVER,
        User.Role.FLEET_OWNER,
    }
)

CRM_STAFF_ROLES = frozenset(
    {
        User.Role.SUPER_ADMIN,
        User.Role.OPS_MANAGER,
        User.Role.HUB_AGENT,
        User.Role.COMMERCIAL_ADMIN,
    }
)


def is_crm_staff(user: User) -> bool:
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "role", "") in CRM_STAFF_ROLES
    )


def resolve_assignable_staff_role(role_code: str) -> Role:
    """
    Resolve an active Role that may be assigned to console staff.
    Allows seeded STAFF_ROLES and custom (non-operator) roles.
    """
    code = (role_code or "").strip().upper()
    if not code:
        raise DomainError(
            "VALIDATION_ERROR",
            "Role is required.",
            details={"role": ["required"]},
        )
    if code in OPERATOR_ROLES:
        raise DomainError(
            "VALIDATION_ERROR",
            "Rider / fleet roles cannot be assigned to staff users.",
            details={"role": ["invalid"]},
        )
    role = Role.objects.filter(code=code).first()
    if role is None:
        raise DomainError(
            "VALIDATION_ERROR",
            "Unknown role.",
            details={"role": ["invalid"]},
        )
    if not role.is_active:
        raise DomainError(
            "VALIDATION_ERROR",
            "This role is inactive.",
            details={"role": ["inactive"]},
        )
    return role
