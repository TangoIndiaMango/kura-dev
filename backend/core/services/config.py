"""Platform config — effective values + maker-checker propose/approve."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from django.db import transaction
from django.utils import timezone

from accounts.helpers.maker_checker import (
    assert_not_self_approve,
    self_approve_audit_metadata,
)
from core.exceptions import DomainError
from core.models import ConfigVersion
from core.services.events import emit_event

SETTINGS_KEY = "settings"

DEFAULTS: dict[str, dict[str, Any]] = {
    "credit": {
        "enabled": False,
        "score_threshold": 60,
        "min_active_days": 60,
        "min_on_time_pct": 80,
        "min_trusted_device_days": 7,
        "min_amount_kobo": 500_000,
        "max_amount_kobo": 5_000_000,
        "tenor_days": [7, 14, 30],
        "interest_rate_bps": 500,
        "auto_approve_max_kobo": 0,
        "disbursement": "SWAP_CREDIT",
        "grace_days": 3,
        "default_after_restricted_days": 7,
    },
    "offers": {
        "enabled": False,
    },
    "ussd": {
        "enabled": False,
        "shortcode": "*347*88#",
        "session_timeout_seconds": 90,
        "primary_language": "en",
        "menu": {
            "1": {"label": "Find hub", "flow": "hubs"},
            "2": {"label": "Wallet balance", "flow": "wallet"},
            "3": {"label": "Reserve swap", "flow": "reserve"},
        },
    },
    "sms_templates": {
        "enabled": False,
        "templates": [
            {
                "code": "SWAP_CODE",
                "name": "Swap reservation code",
                "body": "KURA: your bay code is {code}. Valid {mins} min.",
                "status": "ACTIVE",
            },
            {
                "code": "WALLET_CREDIT",
                "name": "Wallet funded",
                "body": "KURA: {amount} credited. Bal {balance}.",
                "status": "ACTIVE",
            },
        ],
    },
}

NAMESPACE_CAPS: dict[str, str] = {
    "credit": "credit:approve",
    "offers": "offers:manage",
    "ussd": "accounts:manage",
    "sms_templates": "accounts:manage",
}


class ConfigService:
    @classmethod
    def defaults_for(cls, namespace: str) -> dict[str, Any]:
        if namespace not in DEFAULTS:
            raise DomainError("CONFIG_NAMESPACE", f"Unknown namespace '{namespace}'.", http=404)
        return deepcopy(DEFAULTS[namespace])

    @classmethod
    def capability_for(cls, namespace: str) -> str:
        if namespace not in NAMESPACE_CAPS:
            raise DomainError("CONFIG_NAMESPACE", f"Unknown namespace '{namespace}'.", http=404)
        return NAMESPACE_CAPS[namespace]

    @classmethod
    def get_effective(cls, namespace: str, key: str = SETTINGS_KEY) -> dict[str, Any]:
        base = cls.defaults_for(namespace)
        row = (
            ConfigVersion.objects.filter(
                namespace=namespace,
                key=key,
                status=ConfigVersion.Status.ACTIVE,
            )
            .order_by("-effective_from", "-created_at")
            .first()
        )
        if row is None:
            return base
        merged = {**base, **(row.value or {})}
        return merged

    @classmethod
    def is_enabled(cls, namespace: str) -> bool:
        return bool(cls.get_effective(namespace).get("enabled"))

    @classmethod
    def require_enabled(cls, namespace: str) -> None:
        if not cls.is_enabled(namespace):
            code = "CREDIT_DISABLED" if namespace == "credit" else "OFFERS_DISABLED"
            raise DomainError(
                code,
                f"{namespace.title()} is turned off in platform settings.",
                http=403,
            )

    @classmethod
    def namespace_snapshot(cls, namespace: str) -> dict[str, Any]:
        effective = cls.get_effective(namespace)
        pending = (
            ConfigVersion.objects.filter(
                namespace=namespace,
                key=SETTINGS_KEY,
                status=ConfigVersion.Status.PENDING,
            )
            .order_by("-created_at")
            .first()
        )
        active = (
            ConfigVersion.objects.filter(
                namespace=namespace,
                key=SETTINGS_KEY,
                status=ConfigVersion.Status.ACTIVE,
            )
            .order_by("-effective_from", "-created_at")
            .first()
        )
        return {
            "namespace": namespace,
            "effective": effective,
            "active_version_id": str(active.id) if active else None,
            "pending": (
                {
                    "id": str(pending.id),
                    "value": pending.value,
                    "created_by_id": (
                        str(pending.created_by_id) if pending.created_by_id else None
                    ),
                    "note": pending.note,
                    "created_at": pending.created_at.isoformat(),
                }
                if pending
                else None
            ),
        }

    @classmethod
    def propose(
        cls,
        *,
        namespace: str,
        value: dict[str, Any],
        actor,
        note: str = "",
        key: str = SETTINGS_KEY,
    ) -> ConfigVersion:
        cls.defaults_for(namespace)
        if not isinstance(value, dict) or not value:
            raise DomainError("VALIDATION_ERROR", "value must be a non-empty object.", http=400)
        merged = {**cls.get_effective(namespace, key), **value}
        if "enabled" in merged and not isinstance(merged["enabled"], bool):
            raise DomainError("VALIDATION_ERROR", "enabled must be a boolean.", http=400)

        with transaction.atomic():
            ConfigVersion.objects.filter(
                namespace=namespace,
                key=key,
                status=ConfigVersion.Status.PENDING,
            ).update(status=ConfigVersion.Status.REJECTED, updated_at=timezone.now())
            row = ConfigVersion.objects.create(
                namespace=namespace,
                key=key,
                value=merged,
                status=ConfigVersion.Status.PENDING,
                created_by=actor,
                note=(note or "")[:255],
            )
        emit_event(
            action="config.proposed",
            subject_type="config_version",
            subject_id=str(row.id),
            actor=actor,
            after={
                "namespace": namespace,
                "key": key,
                "enabled": merged.get("enabled"),
                "note": row.note,
            },
        )
        return row

    @classmethod
    def approve(cls, *, version: ConfigVersion, actor) -> ConfigVersion:
        if version.status != ConfigVersion.Status.PENDING:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot approve config in status {version.status}.",
                http=409,
            )
        assert_not_self_approve(
            actor=actor,
            created_by_id=version.created_by_id,
            message="Creator cannot approve their own config change.",
        )
        now = timezone.now()
        with transaction.atomic():
            version = ConfigVersion.objects.select_for_update().get(pk=version.pk)
            ConfigVersion.objects.filter(
                namespace=version.namespace,
                key=version.key,
                status=ConfigVersion.Status.ACTIVE,
            ).exclude(pk=version.pk).update(
                status=ConfigVersion.Status.SUPERSEDED,
                updated_at=now,
            )
            version.status = ConfigVersion.Status.ACTIVE
            version.approved_by = actor
            version.effective_from = now
            version.save(
                update_fields=["status", "approved_by", "effective_from", "updated_at"]
            )
        emit_event(
            action="config.approved",
            subject_type="config_version",
            subject_id=str(version.id),
            actor=actor,
            after={
                "namespace": version.namespace,
                "key": version.key,
                "enabled": (version.value or {}).get("enabled"),
                "effective_from": now.isoformat(),
                "approved_by_id": str(actor.id) if actor else None,
                "created_by_id": (
                    str(version.created_by_id) if version.created_by_id else None
                ),
            },
            metadata=self_approve_audit_metadata(
                actor=actor, created_by_id=version.created_by_id
            ),
        )
        return version
