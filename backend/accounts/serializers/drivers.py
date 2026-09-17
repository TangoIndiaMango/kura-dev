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
        ]
        read_only_fields = fields
