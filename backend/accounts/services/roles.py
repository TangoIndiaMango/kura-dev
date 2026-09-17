"""Role / permission mutations — keep ViewSet perform_* thin."""
from __future__ import annotations

from django.db import transaction

from accounts.capabilities import PERMISSION_CATALOG, ROLE_CAPABILITIES, ROLE_META, all_permission_codes
from accounts.models import Permission, Role, User
from core.exceptions import DomainError
from core.services.events import emit_event


class RoleService:
    @staticmethod
    @transaction.atomic
    def sync_catalog() -> tuple[int, int]:
        """Upsert permission catalog + system roles from capabilities.py."""
        perm_map: dict[str, Permission] = {}
        for code, name, module, desc in PERMISSION_CATALOG:
            perm, _ = Permission.objects.update_or_create(
                code=code,
                defaults={"name": name, "module": module, "description": desc},
            )
            perm_map[code] = perm

        roles_touched = 0
        for role_code, grant in ROLE_CAPABILITIES.items():
            meta = ROLE_META.get(role_code, {"name": role_code, "description": ""})
            role, _ = Role.objects.update_or_create(
                code=role_code,
                defaults={
                    "name": meta["name"],
                    "description": meta["description"],
                    "is_system": True,
                    "is_active": True,
                },
            )
            if grant == "*":
                codes = all_permission_codes()
            else:
                codes = list(grant)
            role.permissions.set([perm_map[c] for c in codes if c in perm_map])
            # Attach legacy users (role CharField only) so counts + capability grants match.
            User.objects.filter(role=role.code, assigned_role__isnull=True).update(
                assigned_role=role
            )
            roles_touched += 1
        return len(perm_map), roles_touched

    @staticmethod
    @transaction.atomic
    def create_role(
        *,
        code: str,
        name: str,
        description: str = "",
        permission_ids=None,
        actor=None,
    ) -> Role:
        code = (code or "").strip().upper()
        if Role.objects.filter(code=code).exists():
            raise DomainError(
                "VALIDATION_ERROR",
                "Role code already exists.",
                details={"code": ["unique"]},
            )
        role = Role.objects.create(
            code=code,
            name=name.strip(),
            description=description or "",
            is_system=False,
            is_active=True,
        )
        if permission_ids:
            role.permissions.set(permission_ids)
        emit_event(
            action="role.created",
            subject_type="role",
            subject_id=str(role.id),
            subject_label=role.code,
            actor=actor,
            after={
                "code": role.code,
                "name": role.name,
                "permission_count": role.permissions.count(),
            },
        )
        return role

    @staticmethod
    @transaction.atomic
    def update_role(
        role: Role,
        *,
        name: str | None = None,
        description: str | None = None,
        permission_ids=None,
        is_active: bool | None = None,
        actor=None,
    ) -> Role:
        before = {
            "name": role.name,
            "description": role.description,
            "is_active": role.is_active,
            "permission_ids": list(role.permissions.values_list("id", flat=True)),
        }
        if name is not None:
            role.name = name.strip()
        if description is not None:
            role.description = description
        if is_active is not None:
            role.is_active = is_active
        role.save()
        if permission_ids is not None:
            role.permissions.set(permission_ids)
        emit_event(
            action="role.updated",
            subject_type="role",
            subject_id=str(role.id),
            subject_label=role.code,
            actor=actor,
            before=before,
            after={
                "name": role.name,
                "description": role.description,
                "is_active": role.is_active,
                "permission_ids": list(role.permissions.values_list("id", flat=True)),
            },
        )
        return role

    @staticmethod
    @transaction.atomic
    def set_active(*, role: Role, actor=None, is_active: bool) -> Role:
        if role.is_system and not is_active:
            raise DomainError(
                "VALIDATION_ERROR",
                "System roles cannot be deactivated.",
                http=400,
            )
        return RoleService.update_role(
            role, is_active=is_active, actor=actor
        )
