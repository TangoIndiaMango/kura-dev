# Portable audit trail
#
# Install:
#   1. Copy `audit/` into your Django project
#   2. Add "audit.apps.AuditConfig" to INSTALLED_APPS
#   3. path("api/v1/", include("audit.urls"))
#   4. migrate
#
# Write from domain services via the shared event helper (preferred):
#   from core.services.events import NotifySpec, emit_event
#   emit_event(action=..., subject_type=..., subject_id=..., notify=NotifySpec(...))
#   # notify=None → audit only; channels on NotifySpec cover IN_APP / PUSH / …
#
# Read ACL: `audit:read` opens the API; rows are scoped by subject_type ∩ module
# capabilities (see audit/access.py). `audit:manage` / SUPER_ADMIN see all rows.
#
# Low-level (audit chain only): AuditService.record(...) — advisory lock + tip lock.
#
# Requires: AUTH_USER_MODEL, core.models.BaseModel (or swap BaseModel for your own UUID PK base),
# accounts.permissions.HasCapability (or replace permission_classes).
