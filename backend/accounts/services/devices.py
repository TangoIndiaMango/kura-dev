"""Trusted browser device rows for PWA credit eligibility (not auth)."""
from __future__ import annotations

import hashlib
import re

from django.db import transaction
from django.utils import timezone

from accounts.models import Account, TrustedDevice
from core.exceptions import DomainError
from core.services.events import emit_event

_DEVICE_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)


def hash_device_key(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


class DeviceTrustService:
    @classmethod
    def heartbeat(
        cls,
        *,
        account: Account,
        device_id: str,
        user_agent: str = "",
        label: str = "",
    ) -> TrustedDevice:
        raw = (device_id or "").strip()
        if not _DEVICE_RE.match(raw):
            raise DomainError(
                "VALIDATION_ERROR",
                "device_id must be a UUID.",
                details={"device_id": ["invalid"]},
                http=400,
            )
        key = hash_device_key(raw)
        now = timezone.now()
        ua = (user_agent or "")[:255]
        with transaction.atomic():
            row = (
                TrustedDevice.objects.select_for_update()
                .filter(account=account, device_key=key)
                .first()
            )
            created = False
            if row is None:
                row = TrustedDevice.objects.create(
                    account=account,
                    device_key=key,
                    label=(label or "")[:80],
                    user_agent=ua,
                    first_seen_at=now,
                    last_seen_at=now,
                    status=TrustedDevice.Status.ACTIVE,
                )
                created = True
            else:
                if row.status == TrustedDevice.Status.REVOKED:
                    raise DomainError(
                        "DEVICE_REVOKED",
                        "This browser was revoked. Clear site data or use another browser.",
                        http=403,
                    )
                row.last_seen_at = now
                if ua:
                    row.user_agent = ua
                row.save(update_fields=["last_seen_at", "user_agent", "updated_at"])

        if created:
            emit_event(
                action="device.registered",
                subject_type="trusted_device",
                subject_id=str(row.id),
                after={"account_id": str(account.id)},
            )
            try:
                from risk.services.events import RiskService

                RiskService.emit(
                    rule_code="NEW_DEVICE",
                    subject_type="trusted_device",
                    subject_id=str(row.id),
                    account=account,
                    context={"source": "pwa_heartbeat"},
                    action_taken="STEP_UP",
                )
            except Exception:
                pass
        return row

    @classmethod
    def max_trusted_days(cls, *, account: Account) -> int:
        now = timezone.now()
        best = 0
        for row in TrustedDevice.objects.filter(
            account=account, status=TrustedDevice.Status.ACTIVE
        ).only("first_seen_at"):
            days = max(0, (now.date() - row.first_seen_at.date()).days)
            if days > best:
                best = days
        return best

    @classmethod
    def current_device_days(cls, *, account: Account, device_id: str) -> int | None:
        raw = (device_id or "").strip()
        if not raw:
            return None
        key = hash_device_key(raw)
        row = TrustedDevice.objects.filter(
            account=account,
            device_key=key,
            status=TrustedDevice.Status.ACTIVE,
        ).first()
        if row is None:
            return None
        return max(0, (timezone.now().date() - row.first_seen_at.date()).days)
