import uuid
from django.db import transaction
from core.exceptions import DomainError
from core.money import split_vat
from .models import Wallet, VirtualAccount, LedgerAccount, LedgerTransaction, LedgerEntry, Payment

class LedgerService:
    @staticmethod
    def get_or_create_account(code: str, account_type: str) -> LedgerAccount:
        acct, _ = LedgerAccount.objects.get_or_create(code=code, defaults={'account_type': account_type})
        return acct

    @classmethod
    def post_transaction(cls, *, kind: str, reference: str, description: str, entries: list[dict]) -> LedgerTransaction:
        """
        Entries format:
        [
            {"code": "psp_clearing", "type": "CLEARING", "debit": 10000, "credit": 0},
            {"code": "wallet:KR-1234", "type": "LIABILITY", "debit": 0, "credit": 10000},
        ]
        Enforces sum(debit) == sum(credit).
        """
        total_debit = sum(e.get('debit', 0) for e in entries)
        total_credit = sum(e.get('credit', 0) for e in entries)

        if total_debit != total_credit:
            raise DomainError(
                "LEDGER_UNBALANCED",
                f"Double-entry ledger invariant violated: total debits ({total_debit}) != total credits ({total_credit})."
            )

        with transaction.atomic():
            tx = LedgerTransaction.objects.create(
                kind=kind,
                reference=reference,
                description=description
            )

            for item in entries:
                ledger_acct = cls.get_or_create_account(item['code'], item['type'])
                debit = item.get('debit', 0)
                credit = item.get('credit', 0)

                LedgerEntry.objects.create(
                    transaction=tx,
                    ledger_account=ledger_acct,
                    debit_kobo=debit,
                    credit_kobo=credit
                )

                # Update materialised balance
                if item['type'] in [LedgerAccount.AccountType.ASSET, LedgerAccount.AccountType.EXPENSE, LedgerAccount.AccountType.CLEARING]:
                    ledger_acct.balance_kobo += (debit - credit)
                else:
                    ledger_acct.balance_kobo += (credit - debit)
                ledger_acct.save(update_fields=['balance_kobo'])

            return tx

class WalletService:
    @staticmethod
    def get_or_create_wallet(account) -> Wallet:
        wallet, _ = Wallet.objects.get_or_create(account=account)
        VirtualAccount.objects.get_or_create(account=account)
        return wallet

    @classmethod
    def fund_wallet(cls, *, account, amount_kobo: int, channel='NUBAN_TRANSFER') -> Payment:
        with transaction.atomic():
            wallet = cls.get_or_create_wallet(account)
            wallet.balance_kobo += amount_kobo
            wallet.save(update_fields=['balance_kobo'])

            payment = Payment.objects.create(
                account=account,
                channel=channel,
                amount_kobo=amount_kobo,
                vat_kobo=0,
                purpose='FUND',
                status=Payment.Status.SUCCESS
            )

            # Post to double-entry ledger
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.FUNDING,
                reference=f"FUND-{payment.receipt_code}",
                description=f"Wallet top-up via {channel}",
                entries=[
                    {"code": "psp_clearing", "type": LedgerAccount.AccountType.CLEARING, "debit": amount_kobo, "credit": 0},
                    {"code": f"wallet:{account.kura_id}", "type": LedgerAccount.AccountType.LIABILITY, "debit": 0, "credit": amount_kobo}
                ]
            )

            return payment
