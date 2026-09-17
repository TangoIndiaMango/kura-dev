from __future__ import annotations

from rest_framework import serializers

from core.money import naira_to_kobo
from finance.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "account_id",
            "channel",
            "amount_kobo",
            "vat_kobo",
            "receipt_code",
            "status",
            "purpose",
            "created_at",
        ]


class FundWalletRequestSerializer(serializers.Serializer):
    amount_kobo = serializers.IntegerField(min_value=1, required=False)
    amount_naira = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=1, required=False
    )
    channel = serializers.ChoiceField(
        choices=["CARD", "BANK_TRANSFER", "USSD", "NUBAN_TRANSFER"],
        default="CARD",
    )

    def validate(self, attrs):
        kobo = attrs.get("amount_kobo")
        naira = attrs.get("amount_naira")
        if kobo is None and naira is None:
            raise serializers.ValidationError(
                {"amount_kobo": ["Provide amount_kobo or amount_naira."]}
            )
        if kobo is None:
            attrs["amount_kobo"] = naira_to_kobo(naira)
        return attrs
