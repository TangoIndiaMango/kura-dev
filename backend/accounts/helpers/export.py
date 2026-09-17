"""CSV export helpers for admin list modules — filtered full-set, not page dumps."""
from __future__ import annotations

from core.helpers.csv_export import EXPORT_ROW_CAP, TRUNCATION_NOTE, csv_response

__all__ = [
    "EXPORT_ROW_CAP",
    "TRUNCATION_NOTE",
    "csv_response",
    "staff_user_export_rows",
    "role_export_rows",
    "account_export_rows",
]


def staff_user_export_rows(queryset):
    for user in queryset.iterator(chunk_size=500):
        if not user.is_active:
            status = "SUSPENDED"
        elif user.last_login is None:
            status = "INVITED"
        else:
            status = "ACTIVE"
        name = f"{user.first_name} {user.last_name}".strip() or user.email or user.phone
        yield [
            user.public_id or str(user.id),
            name,
            user.email or "",
            user.phone or "",
            user.assigned_role.name if user.assigned_role_id else user.role,
            status,
            user.last_login.isoformat() if user.last_login else "",
            user.created_at.isoformat() if user.created_at else "",
        ]


def role_export_rows(queryset):
    for role in queryset.iterator(chunk_size=200):
        user_count = getattr(role, "user_count", None)
        if user_count is None:
            from django.db.models import Q
            from accounts.models import User

            user_count = User.objects.filter(
                Q(assigned_role_id=role.id)
                | Q(assigned_role_id__isnull=True, role=role.code)
            ).count()
        yield [
            str(role.id),
            role.code,
            role.name,
            role.description or "",
            user_count,
            "System" if role.is_system else "Custom",
            "ACTIVE" if role.is_active else "INACTIVE",
            role.created_at.isoformat() if role.created_at else "",
        ]


def account_export_rows(queryset):
    qs = queryset.select_related("owner_user")
    for account in qs.iterator(chunk_size=500):
        owner = account.owner_user
        yield [
            str(account.id),
            account.kura_id,
            account.display_name,
            owner.phone if owner else "",
            owner.email if owner else "",
            account.status,
            account.kyc_status,
            account.kind,
            account.registration_channel,
            account.created_at.isoformat() if account.created_at else "",
        ]
