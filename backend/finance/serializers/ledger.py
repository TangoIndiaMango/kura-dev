from __future__ import annotations

from rest_framework import serializers

from finance.models import LedgerEntry, LedgerTransaction


class LedgerEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="ledger_account.code", read_only=True)
    account_type = serializers.CharField(
        source="ledger_account.account_type", read_only=True
    )

    class Meta:
        model = LedgerEntry
        fields = [
            "id",
            "account_code",
            "account_type",
            "debit_kobo",
            "credit_kobo",
        ]


class LedgerTransactionSerializer(serializers.ModelSerializer):
    entries = LedgerEntrySerializer(many=True, read_only=True)

    class Meta:
        model = LedgerTransaction
        fields = ["id", "kind", "reference", "description", "posted_at", "entries"]
