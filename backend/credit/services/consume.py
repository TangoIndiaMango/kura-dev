"""Consume swap-credit entitlement at swap completion (D10)."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account
from core.exceptions import DomainError
from core.services.config import ConfigService
from core.services.events import emit_event
from credit.models import CreditLine, Loan
from finance.models import Payment
from finance.services.payments import PaymentService


def consume_swap_credit(
    *,
    account: Account,
    amount_kobo: int,
    reference: str,
) -> Payment:
    """
    Debit swap_credit_remaining_kobo on the active loan.
    Creates Payment(channel=CREDIT). Does not touch wallet cash.
    """
    ConfigService.require_enabled("credit")
    if amount_kobo <= 0:
        raise DomainError("VALIDATION_ERROR", "amount_kobo must be positive.", http=400)

    with transaction.atomic():
        line = (
            CreditLine.objects.select_for_update()
            .filter(account=account)
            .first()
        )
        if line is not None and line.status in {
            CreditLine.Status.RESTRICTED,
            CreditLine.Status.CLOSED,
        }:
            raise DomainError(
                "CREDIT_LINE_BLOCKED",
                f"Credit line is {line.status}.",
                http=409,
            )

        loan = (
            Loan.objects.select_for_update()
            .filter(
                account=account,
                status__in=[Loan.Status.ACTIVE, Loan.Status.GRACE],
            )
            .order_by("-created_at")
            .first()
        )
        if loan is None:
            raise DomainError(
                "CREDIT_UNAVAILABLE",
                "No active swap-credit loan.",
                http=409,
            )
        remaining = int(loan.swap_credit_remaining_kobo)
        if remaining < amount_kobo:
            raise DomainError(
                "CREDIT_INSUFFICIENT",
                "Swap credit remaining is less than the swap fee.",
                details={
                    "available_kobo": remaining,
                    "shortfall_kobo": amount_kobo - remaining,
                },
                http=409,
            )
        loan.swap_credit_remaining_kobo = remaining - amount_kobo
        loan.save(update_fields=["swap_credit_remaining_kobo", "updated_at"])

        payment = PaymentService.create_payment(
            account=account,
            channel=Payment.Channel.CREDIT,
            amount_kobo=amount_kobo,
            vat_kobo=0,
            purpose="SWAP",
            status=Payment.Status.SUCCESS,
            idempotency_key=f"swap-credit:{reference}"[:64],
        )

    emit_event(
        action="credit.swap_consumed",
        subject_type="loan",
        subject_id=str(loan.id),
        after={
            "amount_kobo": amount_kobo,
            "swap_credit_remaining_kobo": loan.swap_credit_remaining_kobo,
            "reference": reference,
            "payment_id": str(payment.id),
        },
    )
    return payment
