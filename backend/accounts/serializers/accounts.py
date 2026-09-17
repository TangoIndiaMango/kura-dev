from rest_framework import serializers

from accounts.models import Account

from .crm import AccountCrmDetailSerializer, AccountCrmListSerializer

AccountCrmSerializer = AccountCrmDetailSerializer


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "kura_id",
            "owner_user",
            "kind",
            "display_name",
            "status",
            "kyc_status",
            "registration_channel",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "kura_id",
            "owner_user",
            "created_at",
            "status",
            "kyc_status",
            "registration_channel",
        ]


class AccountProfileSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=200)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    id_type = serializers.CharField(max_length=40, required=False, allow_blank=True)
    id_number = serializers.CharField(max_length=80, required=False, allow_blank=True)


class AccountSuspendSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)
