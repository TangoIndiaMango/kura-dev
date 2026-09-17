"""Audit row ACL — audit:read opens the trail; subject_type ∩ module caps scopes rows."""
from __future__ import annotations

from typing import Final

from django.db.models import QuerySet
from django.db.models.functions import Lower

from accounts.permissions import user_capability_set, user_has_capability
from audit.models import AuditEvent

# Normalized subject_type (lowercase) → capability required to *see* that row.
# Unmapped types are visible only to unrestricted auditors (super / audit:manage).
SUBJECT_TYPE_CAPABILITY: Final[dict[str, str]] = {
    "account": "accounts:read",
    "user": "users:read",
    "role": "roles:manage",
    "reservation": "swaps:read",
    "swap": "swaps:read",
    "wallet": "finance:read",
    "virtual_account": "finance:read",
    "payment": "finance:read",
    "psp_webhook_event": "finance:read",
    "pspwebhookevent": "finance:read",
    "support_case": "cases:read",
    "supportcase": "cases:read",
    "risk_event": "risk:read",
    "riskevent": "risk:read",
}


def audit_unrestricted(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    if getattr(user, "role", None) == "SUPER_ADMIN":
        return True
    return user_has_capability(user, "audit:manage")


def allowed_subject_types(user) -> set[str] | None:
    """
    None ⇒ unrestricted (all rows).
    Empty set ⇒ audit:read but no module caps that map to any subject.
    """
    if audit_unrestricted(user):
        return None
    caps = user_capability_set(user)
    return {
        subject
        for subject, need in SUBJECT_TYPE_CAPABILITY.items()
        if need in caps
    }


def scope_audit_qs(qs: QuerySet[AuditEvent], user) -> QuerySet[AuditEvent]:
    allowed = allowed_subject_types(user)
    if allowed is None:
        return qs
    if not allowed:
        return qs.none()
    return qs.annotate(_st=Lower("subject_type")).filter(_st__in=allowed)
