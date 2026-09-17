"""Wallet authorization holds — reserve / capture / release (integer kobo)."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.money import split_vat_inclusive
from finance.models import LedgerAccount, LedgerTransaction, Wallet
from finance.services.ledger import LedgerService
from finance.services.payments import PaymentService
from finance.services.wallets import WalletService


class WalletHoldService:
    @classmethod
    def hold(cls, *, account, amount_kobo: int, reference: str) -> Wallet:
        if amount_kobo <= 0:
            raise DomainError("VALIDATION_ERROR", "Hold amount_kobo must be positive.")
        with transaction.atomic():
            wallet = cls._locked_wallet(account)
            available = int(wallet.balance_kobo) - int(wallet.hold_kobo)
            if available < amount_kobo:
                raise DomainError(
                    "WALLET_INSUFFICIENT",
                    "Insufficient available balance for hold.",
                    details={
                        "available_kobo": available,
                        "shortfall_kobo": amount_kobo - available,
                    },
                    http=409,
                )
            wallet.hold_kobo = int(wallet.hold_kobo) + amount_kobo
            wallet.save(update_fields=["hold_kobo", "updated_at"])
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.HOLD,
                reference=f"HOLD-{reference}"[:100],
                description=f"Wallet hold {amount_kobo} kobo",
                entries=[
                    {
                        "code": f"wallet:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": amount_kobo,
                        "credit": 0,
                    },
                    {
                        "code": f"hold:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": 0,
                        "credit": amount_kobo,
                    },
                ],
            )
            return wallet

    @classmethod
    def release(cls, *, account, amount_kobo: int, reference: str) -> Wallet:
        if amount_kobo <= 0:
            return cls._locked_wallet(account)
        with transaction.atomic():
            wallet = cls._locked_wallet(account)
            release_amt = min(amount_kobo, int(wallet.hold_kobo))
            if release_amt <= 0:
                return wallet
            wallet.hold_kobo = int(wallet.hold_kobo) - release_amt
            wallet.save(update_fields=["hold_kobo", "updated_at"])
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.RELEASE,
                reference=f"REL-{reference}"[:100],
                description=f"Wallet hold release {release_amt} kobo",
                entries=[
                    {
                        "code": f"hold:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": release_amt,
                        "credit": 0,
                    },
                    {
                        "code": f"wallet:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": 0,
                        "credit": release_amt,
                    },
                ],
            )
            return wallet

    @classmethod
    def capture(
        cls,
        *,
        account,
        amount_kobo: int,
        reference: str,
        purpose: str = "SWAP",
    ):
        """Consume hold + balance; post Payment + revenue/VAT ledger."""
        if amount_kobo <= 0:
            raise DomainError("VALIDATION_ERROR", "Capture amount_kobo must be positive.")
        net_kobo, vat_kobo = split_vat_inclusive(amount_kobo)
        with transaction.atomic():
            wallet = cls._locked_wallet(account)
            if int(wallet.hold_kobo) < amount_kobo:
                raise DomainError(
                    "WALLET_HOLD_MISSING",
                    "No matching wallet hold to capture.",
                    details={"hold_kobo": int(wallet.hold_kobo), "needed_kobo": amount_kobo},
                    http=409,
                )
            if int(wallet.balance_kobo) < amount_kobo:
                raise DomainError(
                    "WALLET_INSUFFICIENT",
                    "Insufficient wallet balance to capture hold.",
                    http=409,
                )
            wallet.hold_kobo = int(wallet.hold_kobo) - amount_kobo
            wallet.balance_kobo = int(wallet.balance_kobo) - amount_kobo
            wallet.save(update_fields=["hold_kobo", "balance_kobo", "updated_at"])

            payment = PaymentService.create_payment(
                account=account,
                channel="WALLET_DEBIT",
                amount_kobo=amount_kobo,
                vat_kobo=vat_kobo,
                purpose=purpose,
                status="SUCCESS",
            )
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.CAPTURE,
                reference=f"CAP-{reference}"[:100],
                description=f"Capture hold for {purpose}",
                entries=[
                    {
                        "code": f"hold:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": amount_kobo,
                        "credit": 0,
                    },
                    {
                        "code": "revenue:swap",
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

    @classmethod
    def reverse_capture(
        cls,
        *,
        account,
        amount_kobo: int,
        reference: str,
        payment=None,
    ):
        """Credit wallet and reverse CAPTURE ledger (swap reverse ≤24h)."""
        if amount_kobo <= 0:
            return None
        net_kobo, vat_kobo = split_vat_inclusive(amount_kobo)
        with transaction.atomic():
            wallet = cls._locked_wallet(account)
            wallet.balance_kobo = int(wallet.balance_kobo) + amount_kobo
            wallet.save(update_fields=["balance_kobo", "updated_at"])
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.REVERSAL,
                reference=f"REV-{reference}"[:100],
                description=f"Reverse swap capture {amount_kobo} kobo",
                entries=[
                    {
                        "code": "revenue:swap",
                        "type": LedgerAccount.AccountType.REVENUE,
                        "debit": net_kobo,
                        "credit": 0,
                    },
                    {
                        "code": "vat_payable",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": vat_kobo,
                        "credit": 0,
                    },
                    {
                        "code": f"wallet:{account.kura_id}",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": 0,
                        "credit": amount_kobo,
                    },
                ],
            )
            if payment is not None and payment.status == "SUCCESS":
                payment.status = "REVERSED"
                payment.save(update_fields=["status", "updated_at"])
            return wallet

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
