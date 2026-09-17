from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from finance.models import VirtualAccount, Wallet


class VirtualAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = VirtualAccount
        fields = [
            "id",
            "nuban",
            "bank_name",
            "account_name",
            "psp_reference",
            "status",
        ]


class WalletListSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True)
    available_kobo = serializers.IntegerField(read_only=True)

    class Meta:
        model = Wallet
        fields = [
            "id",
            "account_id",
            "balance_kobo",
            "hold_kobo",
            "available_kobo",
            "status",
            "created_at",
        ]


class WalletDetailSerializer(WalletListSerializer):
    virtual_account = serializers.SerializerMethodField()
    virtual_account_id = serializers.SerializerMethodField()
    demo_fund_enabled = serializers.SerializerMethodField()

    class Meta(WalletListSerializer.Meta):
        fields = [
            *WalletListSerializer.Meta.fields,
            "virtual_account_id",
            "virtual_account",
            "demo_fund_enabled",
            "updated_at",
        ]

    def get_demo_fund_enabled(self, obj: Wallet) -> bool:
        from integrations.services.mock_credit import demo_fund_enabled

        return demo_fund_enabled()

    def get_virtual_account_id(self, obj: Wallet) -> str | None:
        try:
            return str(obj.account.virtual_account.pk)
        except ObjectDoesNotExist:
            return None

    def get_virtual_account(self, obj: Wallet):
        try:
            return VirtualAccountSerializer(obj.account.virtual_account).data
        except ObjectDoesNotExist:
            return None
