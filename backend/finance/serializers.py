from rest_framework import serializers
from .models import Wallet, VirtualAccount, LedgerAccount, LedgerTransaction, LedgerEntry, Payment

class WalletSerializer(serializers.ModelSerializer):
    balance_naira = serializers.SerializerMethodField()
    hold_naira = serializers.SerializerMethodField()
    available_naira = serializers.SerializerMethodField()
    account_kura_id = serializers.CharField(source='account.kura_id', read_only=True)
    account_name = serializers.CharField(source='account.display_name', read_only=True)

    class Meta:
        model = Wallet
        fields = ['id', 'account', 'account_kura_id', 'account_name', 'balance_kobo', 'hold_kobo', 'balance_naira', 'hold_naira', 'available_naira', 'status']

    def get_balance_naira(self, obj) -> float:
        return obj.balance_kobo / 100.0

    def get_hold_naira(self, obj) -> float:
        return obj.hold_kobo / 100.0

    def get_available_naira(self, obj) -> float:
        return obj.available_kobo / 100.0

class VirtualAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = VirtualAccount
        fields = ['id', 'nuban', 'bank_name', 'account_name', 'status']

class LedgerEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='ledger_account.code', read_only=True)
    account_type = serializers.CharField(source='ledger_account.account_type', read_only=True)
    debit_naira = serializers.SerializerMethodField()
    credit_naira = serializers.SerializerMethodField()

    class Meta:
        model = LedgerEntry
        fields = ['id', 'account_code', 'account_type', 'debit_kobo', 'credit_kobo', 'debit_naira', 'credit_naira']

    def get_debit_naira(self, obj) -> float:
        return obj.debit_kobo / 100.0

    def get_credit_naira(self, obj) -> float:
        return obj.credit_kobo / 100.0

class LedgerTransactionSerializer(serializers.ModelSerializer):
    entries = LedgerEntrySerializer(many=True, read_only=True)

    class Meta:
        model = LedgerTransaction
        fields = ['id', 'kind', 'reference', 'description', 'posted_at', 'entries']

class PaymentSerializer(serializers.ModelSerializer):
    amount_naira = serializers.SerializerMethodField()
    vat_naira = serializers.SerializerMethodField()
    account_kura_id = serializers.CharField(source='account.kura_id', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'account', 'account_kura_id', 'channel', 'amount_kobo', 'vat_kobo', 'amount_naira', 'vat_naira', 'receipt_code', 'status', 'purpose', 'created_at']

    def get_amount_naira(self, obj) -> float:
        return obj.amount_kobo / 100.0

    def get_vat_naira(self, obj) -> float:
        return obj.vat_kobo / 100.0

class FundWalletRequestSerializer(serializers.Serializer):
    amount_naira = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=100)
    channel = serializers.ChoiceField(choices=['CARD', 'BANK_TRANSFER', 'USSD'], default='CARD')
