from __future__ import annotations

import logging
import secrets
from uuid import UUID

from django.conf import settings
from django.db import transaction

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
