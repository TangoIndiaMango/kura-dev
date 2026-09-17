from __future__ import annotations

import logging

from django.db import IntegrityError, transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from finance.services import WalletService
from integrations.ports.psp import NormalizedPspEvent, PspCode, PspEventKind
from integrations.models import PspWebhookEvent
from integrations.providers.nomba.transform import normalize_nomba_payload
from integrations.providers.paystack.transform import normalize_paystack_payload
from integrations.registry import get_psp

logger = logging.getLogger("kura.psp")


def ingest_webhook(
    *,
    psp: str,
    headers: dict[str, str],
    raw_body: bytes,
) -> tuple[PspWebhookEvent, bool]:
    client = get_psp(psp)
    if not client.verify_webhook(headers=headers, raw_body=raw_body):
        logger.warning("psp_webhook_rejected", extra={"psp": psp})
        raise DomainError("AUTH_INVALID", "Invalid PSP webhook signature.", http=401)

    normalized = client.normalize_webhook(raw_body=raw_body)
    try:
        with transaction.atomic():
            event = PspWebhookEvent.objects.create(
                psp=normalized.provider.value,
                psp_event_id=normalized.event_id[:120],
                event_kind=normalized.kind.value,
                payload=normalized.raw,
                status=PspWebhookEvent.Status.RECEIVED,
            )
            created = True
    except IntegrityError:
        event = PspWebhookEvent.objects.get(
            psp=normalized.provider.value,
            psp_event_id=normalized.event_id[:120],
        )
        logger.info(
            "psp_webhook_duplicate",
            extra={"psp": psp, "psp_event_id": event.psp_event_id, "id": str(event.id)},
        )
        return event, False

    logger.info(
        "psp_webhook_received",
        extra={
            "psp": psp,
            "psp_event_id": event.psp_event_id,
            "kind": event.event_kind,
            "id": str(event.id),
        },
    )
    emit_event(
        action="psp.webhook.received",
        subject_type="psp_webhook_event",
        subject_id=str(event.id),
        subject_label=f"{event.psp}:{event.psp_event_id}",
        after={
            "psp": event.psp,
            "kind": event.event_kind,
            "status": event.status,
        },
        metadata={"psp_reference": normalized.psp_reference},
    )
    process_psp_event(event.id, normalized=normalized)
    return event, created


def process_psp_event(
    event_id,
    *,
    normalized: NormalizedPspEvent | None = None,
) -> PspWebhookEvent:
    event = PspWebhookEvent.objects.filter(pk=event_id).first()
    if event is None:
        raise DomainError("NOT_FOUND", "Webhook event not found.", http=404)
    if event.status == PspWebhookEvent.Status.PROCESSED:
        return event

    event_data = normalized or _renormalize(event)

    try:
        if event_data.kind == PspEventKind.FUNDING_SUCCESS:
            _apply_funding(event_data)
        elif event_data.kind == PspEventKind.VA_ASSIGNED:
            _apply_va_assigned(event_data)
        else:
            event.status = PspWebhookEvent.Status.IGNORED
            event.save(update_fields=["status", "updated_at"])
            logger.info(
                "psp_webhook_ignored",
                extra={"id": str(event.id), "kind": event_data.kind.value},
            )
            return event

        event.status = PspWebhookEvent.Status.PROCESSED
        event.error = ""
        event.save(update_fields=["status", "error", "updated_at"])
        emit_event(
            action="psp.webhook.processed",
            subject_type="psp_webhook_event",
            subject_id=str(event.id),
            subject_label=f"{event.psp}:{event.psp_event_id}",
            after={"status": event.status, "kind": event.event_kind},
            metadata={"psp_reference": event_data.psp_reference},
        )
        logger.info(
            "psp_webhook_processed",
            extra={"id": str(event.id), "kind": event.event_kind},
        )
    except Exception as exc:
        logger.exception("psp_event_failed", extra={"event_id": str(event.id)})
        event.status = PspWebhookEvent.Status.FAILED
        event.error = str(exc)[:255]
        event.save(update_fields=["status", "error", "updated_at"])
        emit_event(
            action="psp.webhook.failed",
            subject_type="psp_webhook_event",
            subject_id=str(event.id),
            subject_label=f"{event.psp}:{event.psp_event_id}",
            after={"status": event.status, "error": event.error},
        )
        raise
    return event


def _renormalize(event: PspWebhookEvent) -> NormalizedPspEvent:
    if event.psp == PspCode.PAYSTACK:
        return normalize_paystack_payload(event.payload)
    return normalize_nomba_payload(event.payload)


def _apply_funding(event: NormalizedPspEvent) -> None:
    if not event.psp_reference:
        raise DomainError("VALIDATION_ERROR", "Missing PSP reference on funding event.")

    client = get_psp(event.provider)
    verified = client.verify_transaction(psp_reference=event.psp_reference)
    if not verified.ok:
        raise DomainError("INTEGRATION_ERROR", "PSP verify rejected funding event.")

    amount_kobo = verified.amount_kobo if verified.amount_kobo is not None else event.amount_kobo
    if amount_kobo is None or amount_kobo <= 0:
        raise DomainError("VALIDATION_ERROR", "Funding amount missing after PSP verify.")

    account = _resolve_account(event)
    if account is None:
        raise DomainError("NOT_FOUND", "No account matched this funding webhook.", http=404)

    WalletService.get_or_create_wallet(account)
    payment = WalletService.fund_wallet(
        account=account,
        amount_kobo=amount_kobo,
        channel="NUBAN_TRANSFER",
        psp_reference=event.psp_reference,
    )
    emit_event(
        action="wallet.funded",
        subject_type="wallet",
        subject_id=str(account.id),
        subject_label=account.kura_id,
        after={
            "amount_kobo": amount_kobo,
            "psp_reference": event.psp_reference,
            "payment_id": str(payment.id),
            "provider": event.provider.value,
        },
        metadata={"receipt_code": payment.receipt_code},
    )


def _apply_va_assigned(event: NormalizedPspEvent) -> None:
    if not event.nuban or not event.bank_name or not event.account_name:
        raise DomainError("VALIDATION_ERROR", "VA assign event missing NUBAN fields.")
    account = _resolve_account(event)
    if account is None:
        raise DomainError("NOT_FOUND", "No account matched this VA assign webhook.", http=404)
    va = WalletService.assign_virtual_account(
        account=account,
        nuban=event.nuban,
        bank_name=event.bank_name,
        account_name=event.account_name,
        psp_reference=event.psp_reference or "",
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
            "provider": event.provider.value,
        },
        metadata={"psp_reference": va.psp_reference},
    )


def _resolve_account(event: NormalizedPspEvent):
    from accounts.models import Account
    from finance.models import VirtualAccount

    if event.nuban:
        va = VirtualAccount.objects.select_related("account").filter(nuban=event.nuban).first()
        if va:
            return va.account
    if event.psp_reference:
        va = (
            VirtualAccount.objects.select_related("account")
            .filter(psp_reference=event.psp_reference)
            .first()
        )
        if va:
            return va.account
    if event.account_hint:
        account = Account.objects.filter(id=event.account_hint).first()
        if account:
            return account
        va = (
            VirtualAccount.objects.select_related("account")
            .filter(psp_reference=event.account_hint)
            .first()
        )
        if va:
            return va.account
    return None
