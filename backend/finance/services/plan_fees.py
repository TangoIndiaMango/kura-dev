"""Direct wallet debit for plan purchases — PLAN_FEE ledger + Payment(PLAN)."""
from __future__ import annotations

from django.db import IntegrityError, transaction

from core.exceptions import DomainError
from core.money import split_vat_inclusive
from finance.models import LedgerAccount, LedgerTransaction, Payment, Wallet
from finance.services.ledger import LedgerService
from finance.services.payments import PaymentService
from finance.services.wallets import WalletService


class PlanFeeService:
    @classmethod
    def debit(
        cls,
        *,
        account,
        amount_kobo: int,
        idempotency_key: str = "",
    ) -> Payment:
        """Debit available wallet balance for a plan fee (VAT-inclusive gross)."""
        if amount_kobo < 0:
            raise DomainError("VALIDATION_ERROR", "amount_kobo cannot be negative.")
        if amount_kobo == 0:
            return PaymentService.create_payment(
                account=account,
                channel=Payment.Channel.WALLET_DEBIT,
                amount_kobo=0,
                vat_kobo=0,
                purpose="PLAN",
                status=Payment.Status.SUCCESS,
                idempotency_key=idempotency_key or None,
            )

        key = (idempotency_key or "").strip() or None
        if key:
            existing = Payment.objects.filter(idempotency_key=key).first()
            if existing is not None:
                return existing

        net_kobo, vat_kobo = split_vat_inclusive(amount_kobo)
        with transaction.atomic():
            wallet = cls._locked_wallet(account)
            available = int(wallet.balance_kobo) - int(wallet.hold_kobo)
            if available < amount_kobo:
                raise DomainError(
                    "WALLET_INSUFFICIENT",
                    "Insufficient available balance for plan purchase.",
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
                    vat_kobo=vat_kobo,
                    purpose="PLAN",
                    status=Payment.Status.SUCCESS,
                    idempotency_key=key,
                )
            except IntegrityError:
                if key:
                    existing = Payment.objects.filter(idempotency_key=key).first()
                    if existing is not None:
                        return existing
                raise

            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.PLAN_FEE,
                reference=f"plan-fee:{payment.id}",
                description=f"Plan fee {amount_kobo} kobo",
                entries=[
                    {
                        "code": f"wallet:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": amount_kobo,
                        "credit": 0,
                    },
                    {
                        "code": "revenue:plan",
                        "type": LedgerAccount.AccountType.REVENUE,
                        "debit": 0,
                        "credit": net_kobo,
                    },
                    {
                        "code": "vat_payable",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": 0,
                        "credit": vat_kobo,
                    },
                ],
            )
            return payment

    @staticmethod
    def _locked_wallet(account) -> Wallet:
        wallet = (
            Wallet.objects.select_for_update()
            .select_related("account")
            .filter(account=account)
            .first()
        )
        if wallet is None:
            wallet = WalletService.get_or_create_wallet(account)
            wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        if wallet.status != Wallet.Status.ACTIVE:
            raise DomainError("WALLET_FROZEN", "Wallet is not active.", http=409)
        return wallet
