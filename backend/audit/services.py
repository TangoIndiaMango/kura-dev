"""Write path for audit — call from domain services inside transaction.atomic()."""
from __future__ import annotations

import hashlib
import json
from typing import Any

from django.db import connection, transaction
from django.utils import timezone

from audit.models import AuditEvent

# Transaction-scoped advisory lock — serialises hash-chain tips across workers.
# Stable key so every process contends on the same chain (Postgres).
_AUDIT_CHAIN_LOCK_KEY = 874_210_019


def _canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, default=str, separators=(",", ":"))


def _lock_audit_chain() -> None:
    """
    Serialize appends so concurrent record() calls cannot fork the hash chain.
    pg_advisory_xact_lock is released automatically at COMMIT/ROLLBACK.
    On non-Postgres (e.g. sqlite tests), fall back to select_for_update tip lock.
    """
    vendor = connection.vendor
    if vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT pg_advisory_xact_lock(%s)",
                [_AUDIT_CHAIN_LOCK_KEY],
            )
        return
    # SQLite / others: lock tip row if present (empty table still races — rare in tests).
    (
        AuditEvent.objects.select_for_update()
        .order_by("-created_at", "-id")
        .first()
    )


class AuditService:
    @staticmethod
    @transaction.atomic
    def record(
        *,
        action: str,
        subject_type: str,
        subject_id: str,
        actor=None,
        subject_label: str = "",
        before: dict | None = None,
        after: dict | None = None,
        metadata: dict | None = None,
        ip_address: str | None = None,
        request_id: str = "",
    ) -> AuditEvent:
        _lock_audit_chain()

        subject_type = str(subject_type or "").strip().lower()

        prev_row = (
            AuditEvent.objects.select_for_update()
            .order_by("-created_at", "-id")
            .only("row_hash")
            .first()
        )
        prev = (prev_row.row_hash if prev_row else "") or ""

        actor_email = ""
        actor_role = ""
        if actor is not None:
            actor_email = getattr(actor, "email", None) or getattr(actor, "phone", "") or ""
            actor_role = getattr(actor, "role", "") or ""

        body = {
            "action": action,
            "subject_type": subject_type,
            "subject_id": str(subject_id),
            "subject_label": subject_label,
            "actor_email": actor_email,
            "before": before or {},
            "after": after or {},
            "metadata": metadata or {},
            "prev_hash": prev,
            "occurred_at": timezone.now().isoformat(),
        }
        row_hash = hashlib.sha256(_canonical(body).encode()).hexdigest()

        return AuditEvent.objects.create(
            actor=actor if getattr(actor, "pk", None) else None,
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            subject_type=subject_type,
            subject_id=str(subject_id),
            subject_label=subject_label,
            before=before or {},
            after=after or {},
            metadata=metadata or {},
            ip_address=ip_address,
            request_id=request_id or "",
            prev_hash=prev,
            row_hash=row_hash,
        )
