from rest_framework import serializers

from accounts.models import Driver


class DriverSerializer(serializers.ModelSerializer):
    """Driver list/detail — IDs + denormalized display columns for CRM tables."""

    phone = serializers.CharField(source="user.phone", read_only=True, allow_null=True)
    first_name = serializers.CharField(
        source="user.first_name", read_only=True, allow_blank=True
    )
    last_name = serializers.CharField(
        source="user.last_name", read_only=True, allow_blank=True
    )

    class Meta:
        model = Driver
        fields = [
            "id",
            "user",
            "account",
            "phone",
            "first_name",
            "last_name",
            "license_number",
            "status",
            "daily_swap_limit",
            "daily_spend_kobo_limit",
        ]
        read_only_fields = fields


class DriverAttachSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    phone = serializers.CharField(max_length=20)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    license_number = serializers.CharField(
        required=False, allow_blank=True, max_length=50
    )
    daily_swap_limit = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    daily_spend_kobo_limit = serializers.IntegerField(
        required=False, allow_null=True, min_value=0
    )


class DriverLimitsSerializer(serializers.Serializer):
    daily_swap_limit = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    daily_spend_kobo_limit = serializers.IntegerField(
        required=False, allow_null=True, min_value=0
    )
