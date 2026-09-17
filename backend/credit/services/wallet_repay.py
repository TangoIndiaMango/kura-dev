"""Wallet debit for credit loan repayments (principal + interest ledger split)."""
from __future__ import annotations

from django.db import IntegrityError, transaction

from core.exceptions import DomainError
from core.money import split_vat_inclusive
from finance.models import LedgerAccount, LedgerTransaction, Payment, Wallet
from finance.services.ledger import LedgerService
from finance.services.payments import PaymentService
from finance.services.wallets import WalletService


class LoanRepayWalletService:
    @classmethod
    def debit(
        cls,
        *,
        account,
        amount_kobo: int,
        idempotency_key: str,
        interest_kobo: int = 0,
        principal_kobo: int | None = None,
    ) -> Payment:
        if amount_kobo <= 0:
            raise DomainError(
                "VALIDATION_ERROR", "amount_kobo must be positive.", http=400
            )
        interest = max(0, int(interest_kobo or 0))
        principal = (
            int(principal_kobo)
            if principal_kobo is not None
            else max(0, amount_kobo - interest)
        )
        if interest + principal != amount_kobo:
            raise DomainError(
                "VALIDATION_ERROR",
                "interest_kobo + principal_kobo must equal amount_kobo.",
                http=400,
            )
        key = (idempotency_key or "").strip() or None
        if key:
            existing = Payment.objects.filter(idempotency_key=key).first()
            if existing is not None:
                return existing

        with transaction.atomic():
            wallet = (
                Wallet.objects.select_for_update()
                .filter(account=account)
                .first()
            )
            if wallet is None:
                wallet = WalletService.get_or_create_wallet(account)
                wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
            if wallet.status != Wallet.Status.ACTIVE:
                raise DomainError("WALLET_FROZEN", "Wallet is not active.", http=409)
            available = int(wallet.balance_kobo) - int(wallet.hold_kobo)
            if available < amount_kobo:
                raise DomainError(
                    "WALLET_INSUFFICIENT",
                    "Insufficient available balance for loan repayment.",
                    details={
                        "available_kobo": available,
                        "shortfall_kobo": amount_kobo - available,
                    },
                    http=409,
                )
            wallet.balance_kobo = int(wallet.balance_kobo) - amount_kobo
            wallet.save(update_fields=["balance_kobo", "updated_at"])
            try:
                payment = PaymentService.create_payment(
                    account=account,
                    channel=Payment.Channel.WALLET_DEBIT,
                    amount_kobo=amount_kobo,
                    vat_kobo=0,
                    purpose="LOAN_REPAY",
                    status=Payment.Status.SUCCESS,
                    idempotency_key=key,
                )
            except IntegrityError:
                if key:
                    existing = Payment.objects.filter(idempotency_key=key).first()
                    if existing is not None:
                        return existing
                raise

            entries: list[dict] = [
                {
                    "code": f"wallet:{account.kura_id}",
                    "type": LedgerAccount.AccountType.LIABILITY,
                    "debit": amount_kobo,
                    "credit": 0,
                },
            ]
            if principal > 0:
                entries.append(
                    {
                        "code": "asset:loan_receivable",
                        "type": LedgerAccount.AccountType.ASSET,
                        "debit": 0,
                        "credit": principal,
                    }
                )
            if interest > 0:
                net_kobo, vat_kobo = split_vat_inclusive(interest)
                entries.append(
                    {
                        "code": "revenue:loan_interest",
                        "type": LedgerAccount.AccountType.REVENUE,
                        "debit": 0,
                        "credit": net_kobo,
                    }
                )
                if vat_kobo > 0:
                    entries.append(
                        {
                            "code": "vat_payable",
                            "type": LedgerAccount.AccountType.LIABILITY,
                            "debit": 0,
                            "credit": vat_kobo,
                        }
                    )

            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.LOAN_REPAY,
                reference=f"loan-repay:{payment.id}",
                description=(
                    f"Loan repayment {amount_kobo} kobo "
                    f"(interest {interest}, principal {principal})"
                ),
                entries=entries,
            )
            return payment
