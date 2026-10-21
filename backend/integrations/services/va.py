from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from accounts.models import Account
from core.exceptions import DomainError
from core.services.events import emit_event
from finance.models import VirtualAccount
from finance.services import WalletService
from integrations.ports.psp import PspCode
from integrations.registry import get_psp

logger = logging.getLogger("kura.psp")


def resolve_account_psp(account: Account) -> str:
    if account.psp:
        return account.psp
    return getattr(settings, "DEFAULT_PSP", PspCode.PAYSTACK)


def schedule_va_provision(
    account_id: UUID | str, *, bvn_or_nin: str | None = None
) -> None:
    """F1: after profile commit, kick PSP VA without holding the request transaction."""

    def _run() -> None:
        account = (
            Account.objects.select_related("owner_user").filter(pk=account_id).first()
        )
        if account is None:
            return
        va = VirtualAccount.objects.filter(account=account).first()
        if va and va.status == VirtualAccount.Status.ACTIVE and va.nuban:
            return
        try:
            provision_virtual_account_for(account, bvn_or_nin=bvn_or_nin)
        except Exception:
            logger.exception(
                "va_schedule_failed",
                extra={"account_id": str(account_id)},
            )

    transaction.on_commit(_run)


# E1.5: 5 m, 15 m, then hourly for 24 h. Attempt N waits RETRY_DELAYS[N-1].
RETRY_DELAYS = (timedelta(minutes=5), timedelta(minutes=15)) + (timedelta(hours=1),) * 24


# PSP errors that are about our merchant account, not the rider: every rider
# fails the same way, so ops hear about it at once (not 24 h later per rider).
PSP_ACCOUNT_ERROR_CODES = {"feature_unavailable", "invalid_key", "unauthorized"}


def _psp_error(exc: Exception) -> tuple[str, str]:
    """(readable message, PSP error code) from a failed provider call."""
    import json

    details = getattr(exc, "details", None) or {}
    body = details.get("body") if isinstance(details, dict) else None
    if isinstance(body, str):
        try:
            payload = json.loads(body)
        except ValueError:
            payload = None
        if isinstance(payload, dict) and payload.get("message"):
            return str(payload["message"]), str(payload.get("code") or "")
    return str(exc), ""


def _record_attempt(account: Account, *, error: str = "") -> None:
    """Count this try and schedule the next one (None once the schedule is spent)."""
    va = VirtualAccount.objects.filter(account=account).first()
    if va is None or va.status == VirtualAccount.Status.ACTIVE:
        return
    now = timezone.now()
    attempts = va.provision_attempts + 1
    delay = RETRY_DELAYS[attempts - 1] if attempts <= len(RETRY_DELAYS) else None
    VirtualAccount.objects.filter(pk=va.pk).update(
        provision_attempts=attempts,
        last_attempt_at=now,
        next_attempt_at=now + delay if delay else None,
        last_error=error[:255],
        updated_at=now,
    )


def _identity_number(account: Account) -> str | None:
    """Latest BVN/NIN on file, for PSP customer validation on retry."""
    from accounts.models import IdentityDocument
    from core.helpers.crypto import decrypt_text

    doc = (
        IdentityDocument.objects.filter(
            account=account,
            doc_type__in=[IdentityDocument.DocType.BVN, IdentityDocument.DocType.NIN],
        )
        .exclude(number_encrypted="")
        .order_by("-created_at")
        .first()
    )
    if doc is None:
        return None
    try:
        return decrypt_text(doc.number_encrypted) or None
    except Exception:
        logger.warning("va_retry_id_decrypt_failed", extra={"account_id": str(account.id)})
        return None


def _alert_psp_account_problem(psp_code: str, message: str, code: str) -> None:
    from risk.services.notify_staff import notify_risk_reviewers

    day = timezone.localdate().isoformat()
    notify_risk_reviewers(
        title=f"{psp_code.title()} cannot issue transfer accounts",
        body=(
            f"{psp_code.title()} refused NUBAN requests for every rider: {message}. "
            "Riders stay on 'pending' and are retried automatically once this is fixed."
        ),
        link_path="/operators",
        dedupe_key=f"va.psp_account:{psp_code}:{code}:{day}",
    )


def retry_pending_virtual_accounts(*, limit: int = 50) -> dict:
    """Worker sweep: re-request NUBANs still PENDING once their retry is due.

    Covers both a failed PSP call and an accepted request whose assign webhook
    never arrived. When the schedule is spent, ops are told once.
    """
    from risk.services.notify_staff import notify_risk_reviewers

    now = timezone.now()
    due = list(
        VirtualAccount.objects.filter(
            status=VirtualAccount.Status.PENDING,
            next_attempt_at__isnull=False,
            next_attempt_at__lte=now,
        )
        .select_related("account", "account__owner_user")
        .order_by("next_attempt_at")[:limit]
    )
    retried = assigned = gave_up = 0
    for va in due:
        account = va.account
        retried += 1
        try:
            provision_virtual_account_for(account, bvn_or_nin=_identity_number(account))
        except Exception:
            pass  # provision_virtual_account_for logged and recorded the error
        va.refresh_from_db()
        if va.last_error.endswith("[rate_limited]"):
            # The PSP asked us to slow down: leave the rest for the next sweep.
            break
        if va.status == VirtualAccount.Status.ACTIVE:
            assigned += 1
        elif va.next_attempt_at is None:
            gave_up += 1
            emit_event(
                action="virtual_account.provision_gave_up",
                subject_type="virtual_account",
                subject_id=str(account.id),
                subject_label=account.kura_id,
                after={"attempts": va.provision_attempts, "status": va.status},
                metadata={"last_error": va.last_error},
            )
            notify_risk_reviewers(
                title="Transfer account not issued",
                body=(
                    f"{account.kura_id} ({account.display_name}) still has no NUBAN after "
                    f"{va.provision_attempts} tries. Check their ID and the PSP dashboard."
                    + (f" Last error: {va.last_error}" if va.last_error else "")
                ),
                link_path=f"/operators/{account.id}",
                dedupe_key=f"va.gave_up:{account.id}",
            )
    return {"retried": retried, "assigned": assigned, "gave_up": gave_up}


def _dev_va_allowed() -> bool:
    return bool(settings.DEBUG and getattr(settings, "PSP_ALLOW_DEV_VA", False))


def _generate_dev_nuban() -> str:
    for _ in range(24):
        digits = f"99{secrets.randbelow(10**8):08d}"
        if not VirtualAccount.objects.filter(nuban=digits).exists():
            return digits
    raise DomainError("INTEGRATION_ERROR", "Could not allocate a unique dev NUBAN.")


def attach_dev_virtual_account(
    account: Account, *, psp_code: str, reason: str, psp_reference: str = ""
):
    """DEBUG-only fallback when Dedicated NUBAN / PSP assign is unavailable."""
    if not _dev_va_allowed():
        raise DomainError(
            "INTEGRATION_ERROR",
            "Dev virtual accounts are disabled outside DEBUG.",
        )
    ref = (psp_reference or "").strip() or f"dev-va:{account.kura_id}"
    va = WalletService.assign_virtual_account(
        account=account,
        nuban=_generate_dev_nuban(),
        bank_name="Wema Bank / KURA DEV",
        account_name=f"KURA / {account.display_name}"[:150],
        psp_reference=ref[:100],
    )
    emit_event(
        action="virtual_account.dev_attached",
        subject_type="virtual_account",
        subject_id=str(account.id),
        subject_label=account.kura_id,
        after={
            "nuban": va.nuban,
            "bank_name": va.bank_name,
            "status": va.status,
            "provider": psp_code,
            "dev": True,
        },
        metadata={"reason": reason[:200], "psp_reference": va.psp_reference},
    )
    logger.warning(
        "va_dev_attached",
        extra={
            "account_id": str(account.id),
            "nuban": va.nuban,
            "reason": reason[:120],
        },
    )
    return va


def provision_virtual_account_for(account: Account, *, bvn_or_nin: str | None = None):
    """Kick off VA with the account's PSP. Paystack may stay PENDING until webhook."""
    owner = account.owner_user
    psp_code = resolve_account_psp(account)
    psp = get_psp(psp_code)
    WalletService.get_or_create_wallet(account)
    WalletService.ensure_pending_virtual_account(account)

    logger.info(
        "va_provision_start",
        extra={
            "account_id": str(account.id),
            "kura_id": account.kura_id,
            "psp": psp_code,
        },
    )
    try:
        result = psp.provision_virtual_account(
            account_id=str(account.id),
            display_name=account.display_name,
            email=getattr(owner, "email", None),
            phone=getattr(owner, "phone", None),
            bvn_or_nin=bvn_or_nin,
        )
    except Exception as exc:
        customer_code = ""
        details = getattr(exc, "details", None)
        if isinstance(details, dict):
            customer_code = str(details.get("customer_code") or "")
        if customer_code:
            VirtualAccount.objects.filter(account=account).update(
                psp_reference=customer_code
            )
        if _dev_va_allowed():
            return attach_dev_virtual_account(
                account,
                psp_code=psp_code,
                reason=str(exc),
                psp_reference=customer_code,
            )
        account.kyc_status = Account.KycStatus.PENDING_PSP
        account.save(update_fields=["kyc_status", "updated_at"])
        message, code = _psp_error(exc)
        _record_attempt(account, error=f"{message} [{code}]" if code else message)
        if code in PSP_ACCOUNT_ERROR_CODES or "(401)" in str(exc):
            _alert_psp_account_problem(psp_code, message, code or "unauthorized")
        logger.exception(
            "va_provision_failed",
            extra={"account_id": str(account.id), "psp": psp_code},
        )
        emit_event(
            action="virtual_account.provision_failed",
            subject_type="virtual_account",
            subject_id=str(account.id),
            subject_label=account.kura_id,
            after={"kyc_status": account.kyc_status, "provider": psp_code},
            metadata={"psp_reference": customer_code, "error": str(exc)[:200]},
        )
        raise

    if result.psp_reference:
        VirtualAccount.objects.filter(account=account).update(
            psp_reference=result.psp_reference
        )
    if result.pending:
        # Accepted; the NUBAN arrives by webhook. Retry later in case it never does.
        _record_attempt(account)

    if not result.pending and result.nuban and result.bank_name and result.account_name:
        va = WalletService.assign_virtual_account(
            account=account,
            nuban=result.nuban,
            bank_name=result.bank_name,
            account_name=result.account_name,
            psp_reference=result.psp_reference,
        )
        emit_event(
            action="virtual_account.assigned",
            subject_type="virtual_account",
            subject_id=str(account.id),
            subject_label=account.kura_id,
            after={
                "nuban": va.nuban,
                "bank_name": va.bank_name,
                "status": va.status,
                "provider": psp_code,
            },
            metadata={"psp_reference": va.psp_reference},
        )
        return va

    if _dev_va_allowed():
        return attach_dev_virtual_account(
            account,
            psp_code=psp_code,
            reason="psp_pending_dev_shortcut",
            psp_reference=result.psp_reference,
        )

    account.kyc_status = Account.KycStatus.PENDING_PSP
    account.save(update_fields=["kyc_status", "updated_at"])
    emit_event(
        action="virtual_account.provision_pending",
        subject_type="virtual_account",
        subject_id=str(account.id),
        subject_label=account.kura_id,
        after={"kyc_status": account.kyc_status, "provider": psp_code},
        metadata={"psp_reference": result.psp_reference},
    )
    logger.info(
        "va_provision_pending",
        extra={
            "account_id": str(account.id),
            "psp_reference": result.psp_reference,
        },
    )
    return result
