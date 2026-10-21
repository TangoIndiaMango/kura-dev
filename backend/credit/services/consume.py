"""Consume swap-credit entitlement at swap completion (D10)."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account
from core.exceptions import DomainError
from core.money import split_vat_inclusive
from core.services.config import ConfigService
from core.services.events import emit_event
from credit.models import CreditLine, Loan
from finance.models import LedgerAccount, LedgerTransaction, Payment
from finance.services.ledger import LedgerService
from finance.services.payments import PaymentService


def consume_swap_credit(
    *,
    account: Account,
    amount_kobo: int,
    reference: str,
    hub=None,
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

        net_kobo, vat_kobo = split_vat_inclusive(amount_kobo)
        payment = PaymentService.create_payment(
            account=account,
            channel=Payment.Channel.CREDIT,
            amount_kobo=amount_kobo,
            vat_kobo=vat_kobo,
            purpose="SWAP",
            status=Payment.Status.SUCCESS,
            idempotency_key=f"swap-credit:{reference}"[:64],
            hub=hub,  # hub daily collections must include credit swaps
        )
        # Credit swap = revenue now, owed by the rider: receivable up, revenue +
        # VAT recognised. Repayments (wallet_repay) credit the receivable back.
        entries = [
            {
                "code": "asset:loan_receivable",
                "type": LedgerAccount.AccountType.ASSET,
                "debit": amount_kobo,
                "credit": 0,
            },
            {
                "code": "revenue:swap",
                "type": LedgerAccount.AccountType.REVENUE,
                "debit": 0,
                "credit": net_kobo,
            },
        ]
        if vat_kobo:
            entries.append(
                {
                    "code": "vat_payable",
                    "type": LedgerAccount.AccountType.LIABILITY,
                    "debit": 0,
                    "credit": vat_kobo,
                }
            )
        LedgerService.post_transaction(
            kind=LedgerTransaction.Kind.SWAP_FEE,
            reference=f"CREDIT-{payment.receipt_code}"[:100],
            description=f"Swap on credit {payment.receipt_code}",
            entries=entries,
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
