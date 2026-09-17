"""Maker-checker bypass rules for dual-control approvals."""
from __future__ import annotations

from accounts.models import User


def can_bypass_maker_checker(actor) -> bool:
    """
    Super Admin may approve their own proposals; everyone else needs a checker.

    Matches HasCapability's SUPER_ADMIN recognition: is_superuser, role, or
    assigned_role.code.
    """
    if actor is None:
        return False
    if getattr(actor, "is_superuser", False):
        return True
    if getattr(actor, "role", None) == User.Role.SUPER_ADMIN:
        return True
    assigned = getattr(actor, "assigned_role", None)
    if assigned is not None and getattr(assigned, "code", None) == User.Role.SUPER_ADMIN:
        return True
    return False


def assert_not_self_approve(*, actor, created_by_id, message: str) -> None:
    """Raise APPROVAL_FORBIDDEN unless actor is Super Admin (bypass)."""
    from core.exceptions import DomainError

    if actor is None or not created_by_id:
        return
    if created_by_id != actor.id:
        return
    if can_bypass_maker_checker(actor):
        return
    raise DomainError("APPROVAL_FORBIDDEN", message, http=403)


def self_approve_audit_metadata(*, actor, created_by_id) -> dict:
    self_approved = bool(
        actor is not None and created_by_id and created_by_id == actor.id
    )
    return {
        "self_approved": self_approved,
        "maker_checker_bypass": self_approved and can_bypass_maker_checker(actor),
    }
