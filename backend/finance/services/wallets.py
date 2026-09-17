from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from finance.models import LedgerAccount, LedgerTransaction, Payment, VirtualAccount, Wallet
from finance.services.ledger import LedgerService
from finance.services.payments import PaymentService


class WalletService:
    @staticmethod
    def get_or_create_wallet(account) -> Wallet:
        wallet, _ = Wallet.objects.get_or_create(account=account)
        return wallet

    @staticmethod
    def ensure_pending_virtual_account(account) -> VirtualAccount:
        va, _ = VirtualAccount.objects.get_or_create(
            account=account,
            defaults={"status": VirtualAccount.Status.PENDING},
        )
        return va

    @classmethod
    def assign_virtual_account(
        cls,
        *,
        account,
        nuban: str,
        bank_name: str,
        account_name: str,
        psp_reference: str = "",
    ) -> VirtualAccount:
        """Sole write path that activates a NUBAN (PSP webhook / assign success)."""
        digits = "".join(ch for ch in (nuban or "") if ch.isdigit())
        if len(digits) != 10:
            raise DomainError(
                "VALIDATION_ERROR",
                "PSP NUBAN must be 10 digits.",
                details={"nuban": ["invalid"]},
            )
        bank = (bank_name or "").strip()
        name = (account_name or "").strip()
        if not bank or not name:
            raise DomainError(
                "VALIDATION_ERROR",
                "PSP bank_name and account_name are required.",
            )

        with transaction.atomic():
            va = cls.ensure_pending_virtual_account(account)
            va = VirtualAccount.objects.select_for_update().get(pk=va.pk)
            conflict = (
                VirtualAccount.objects.filter(nuban=digits)
                .exclude(pk=va.pk)
                .exists()
            )
            if conflict:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "NUBAN already assigned to another account.",
                    details={"nuban": ["conflict"]},
                )
            va.nuban = digits
            va.bank_name = bank
            va.account_name = name
            va.psp_reference = (psp_reference or "").strip()
            va.status = VirtualAccount.Status.ACTIVE
            va.save(
                update_fields=[
                    "nuban",
                    "bank_name",
                    "account_name",
                    "psp_reference",
                    "status",
                    "updated_at",
                ]
            )
            return va

    @classmethod
    def fund_wallet(
        cls,
        *,
        account,
        amount_kobo: int,
        channel: str = "NUBAN_TRANSFER",
        psp_reference: str | None = None,
    ) -> Payment:
        if amount_kobo <= 0:
            raise DomainError("VALIDATION_ERROR", "amount_kobo must be positive.")

        if psp_reference:
            existing = Payment.objects.filter(psp_reference=psp_reference).first()
            if existing is not None:
                return existing

        with transaction.atomic():
            if psp_reference:
                existing = (
                    Payment.objects.select_for_update()
                    .filter(psp_reference=psp_reference)
                    .first()
                )
                if existing is not None:
                    return existing

            wallet = (
                Wallet.objects.select_for_update()
                .select_related("account")
                .filter(account=account)
                .first()
            )
            if wallet is None:
                wallet = cls.get_or_create_wallet(account)
                wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)

            wallet.balance_kobo += amount_kobo
            wallet.save(update_fields=["balance_kobo", "updated_at"])

            payment = PaymentService.create_payment(
                account=account,
                channel=channel,
                amount_kobo=amount_kobo,
                vat_kobo=0,
                purpose="FUND",
                status="SUCCESS",
                psp_reference=psp_reference,
            )
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.FUNDING,
                reference=f"FUND-{payment.receipt_code}",
                description=f"Wallet top-up via {channel}",
                entries=[
                    {
                        "code": "psp_clearing",
                        "type": LedgerAccount.AccountType.CLEARING,
                        "debit": amount_kobo,
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
            return payment
