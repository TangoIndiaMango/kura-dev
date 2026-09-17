from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from finance.models import LedgerAccount, LedgerEntry, LedgerTransaction


class LedgerService:
    @staticmethod
    def get_or_create_account(code: str, account_type: str) -> LedgerAccount:
        acct, _ = LedgerAccount.objects.get_or_create(
            code=code, defaults={"account_type": account_type}
        )
        return acct

    @classmethod
    def post_transaction(
        cls,
        *,
        kind: str,
        reference: str,
        description: str,
        entries: list[dict],
    ) -> LedgerTransaction:
        total_debit = sum(e.get("debit", 0) for e in entries)
        total_credit = sum(e.get("credit", 0) for e in entries)
        if total_debit != total_credit:
            raise DomainError(
                "LEDGER_UNBALANCED",
                f"Debits ({total_debit}) != credits ({total_credit}).",
            )

        with transaction.atomic():
            tx = LedgerTransaction.objects.create(
                kind=kind,
                reference=reference,
                description=description,
            )
            for item in entries:
                ledger_acct = cls.get_or_create_account(item["code"], item["type"])
                ledger_acct = LedgerAccount.objects.select_for_update().get(
                    pk=ledger_acct.pk
                )
                debit = item.get("debit", 0)
                credit = item.get("credit", 0)
                LedgerEntry.objects.create(
                    transaction=tx,
                    ledger_account=ledger_acct,
                    debit_kobo=debit,
                    credit_kobo=credit,
                )
                if item["type"] in {
                    LedgerAccount.AccountType.ASSET,
                    LedgerAccount.AccountType.EXPENSE,
                    LedgerAccount.AccountType.CLEARING,
                }:
                    ledger_acct.balance_kobo += debit - credit
                else:
                    ledger_acct.balance_kobo += credit - debit
                ledger_acct.save(update_fields=["balance_kobo"])
            return tx
