"""Consent write path (NDPA) — grant / withdraw with an audit row per change."""
from __future__ import annotations

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from accounts.models import Account, Consent
from core.exceptions import DomainError
from core.services.events import emit_event

PURPOSES = tuple(Consent.Purpose.values)


def current_policy_version() -> str:
    return str(getattr(settings, "CONSENT_POLICY_VERSION", "") or "1")


def _active(account: Account, purpose: str, *, lock: bool = False) -> Consent | None:
    qs = Consent.objects.filter(
        account=account, purpose=purpose, withdrawn_at__isnull=True
    )
    if lock:
        qs = qs.select_for_update()
    return qs.first()


def _row_payload(row: Consent | None) -> dict:
    if row is None:
        return {
            "granted": False,
            "granted_at": None,
            "withdrawn_at": None,
            "channel": None,
            "policy_version": None,
        }
    return {
        "granted": row.is_active,
        "granted_at": row.granted_at.isoformat(),
        "withdrawn_at": row.withdrawn_at.isoformat() if row.withdrawn_at else None,
        "channel": row.channel,
        "policy_version": row.policy_version,
    }


class ConsentService:
    @staticmethod
    def _validate_purpose(purpose: str) -> str:
        value = (purpose or "").strip().upper()
        if value not in PURPOSES:
            raise DomainError(
                "VALIDATION_ERROR",
                "Unknown consent purpose.",
                details={"purpose": ["invalid"]},
            )
        return value

    @staticmethod
    def _channel(channel: str) -> str:
        value = (channel or "").strip().upper()
        return value if value in Consent.Channel.values else Consent.Channel.WEB

    @staticmethod
    @transaction.atomic
    def grant(
        *,
        account: Account,
        purpose: str,
        channel: str = "",
        actor=None,
        policy_version: str = "",
    ) -> Consent:
        """Idempotent at the same policy version; a newer version re-stamps the active row."""
        purpose = ConsentService._validate_purpose(purpose)
        version = policy_version or current_policy_version()
        channel = ConsentService._channel(channel)
        now = timezone.now()
        row = _active(account, purpose, lock=True)
        if row is not None and row.policy_version == version:
            return row

        before = _row_payload(row) if row is not None else None
        if row is None:
            row = Consent.objects.create(
                account=account,
                purpose=purpose,
                granted_at=now,
                channel=channel,
                policy_version=version,
            )
        else:
            row.granted_at = now
            row.channel = channel
            row.policy_version = version
            row.save(
                update_fields=["granted_at", "channel", "policy_version", "updated_at"]
            )

        emit_event(
            action="consent.granted",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=account.kura_id,
            actor=actor,
            before=before,
            after={"purpose": purpose, **_row_payload(row)},
        )
        return row

    @staticmethod
    @transaction.atomic
    def withdraw(*, account: Account, purpose: str, actor=None) -> Consent | None:
        purpose = ConsentService._validate_purpose(purpose)
        if purpose == Consent.Purpose.SERVICE:
            # E1.11 — only deregistration (F12) ends SERVICE consent.
            raise DomainError(
                "CONSENT_NOT_WITHDRAWABLE",
                "Service consent can only end by closing your account.",
                details={"purpose": ["not_withdrawable"]},
            )
        row = _active(account, purpose, lock=True)
        if row is None:
            return None
        before = _row_payload(row)
        row.withdrawn_at = timezone.now()
        row.save(update_fields=["withdrawn_at", "updated_at"])
        emit_event(
            action="consent.withdrawn",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=account.kura_id,
            actor=actor,
            before=before,
            after={"purpose": purpose, **_row_payload(row)},
        )
        return row

    @staticmethod
    def has_service_consent(account: Account) -> bool:
        row = _active(account, Consent.Purpose.SERVICE)
        return row is not None and row.policy_version == current_policy_version()

    @staticmethod
    def state(account: Account) -> dict:
        """Current consent per purpose for /auth/me."""
        latest: dict[str, Consent] = {}
        for row in Consent.objects.filter(account=account).order_by("-granted_at"):
            current = latest.get(row.purpose)
            # Active row wins; otherwise the most recent withdrawn one.
            if current is None or (row.is_active and not current.is_active):
                latest[row.purpose] = row
        version = current_policy_version()
        service = latest.get(Consent.Purpose.SERVICE)
        needs_service = not (
            service is not None
            and service.is_active
            and service.policy_version == version
        )
        return {
            "policy_version": version,
            "service": _row_payload(latest.get(Consent.Purpose.SERVICE)),
            "data_sharing": _row_payload(latest.get(Consent.Purpose.DATA_SHARING)),
            "needs_service_consent": needs_service,
            # Riders who already gave us ID data (or were registered at a hub)
            # before consent capture existed confirm on their next sign-in.
            # Fresh riders (kyc NONE) consent on the identity form instead.
            "prompt_required": needs_service
            and account.kyc_status != Account.KycStatus.NONE,
        }
