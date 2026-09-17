"""E-boarder fleet serializers."""
from __future__ import annotations

from rest_framework import serializers

from mobility.models import BatteryType, EBoarder, Hub


class EBoarderListSerializer(serializers.ModelSerializer):
    battery_type_id = serializers.UUIDField(source="battery_type.id", read_only=True)
    battery_type_name = serializers.CharField(
        source="battery_type.name", read_only=True
    )
    current_hub_id = serializers.UUIDField(
        source="current_hub.id", read_only=True, allow_null=True
    )
    current_hub_code = serializers.CharField(
        source="current_hub.code", read_only=True, allow_null=True
    )
    current_hub_name = serializers.CharField(
        source="current_hub.name", read_only=True, allow_null=True
    )
    vehicle_id = serializers.UUIDField(
        source="vehicle.id", read_only=True, allow_null=True
    )
    vehicle_reg = serializers.CharField(
        source="vehicle.registration_plate", read_only=True, allow_null=True
    )
    account_id = serializers.UUIDField(
        source="account.id", read_only=True, allow_null=True
    )
    owner_name = serializers.CharField(
        source="account.display_name", read_only=True, allow_null=True
    )
    rated_kw = serializers.CharField(source="rated_kw_display", read_only=True)

    class Meta:
        model = EBoarder
        fields = [
            "id",
            "serial",
            "make",
            "model",
            "rated_watts",
            "rated_kw",
            "petrol_hp_equivalent",
            "nominal_voltage_v",
            "battery_type_id",
            "battery_type_name",
            "shaft_length",
            "status",
            "current_hub_id",
            "current_hub_code",
            "current_hub_name",
            "vehicle_id",
            "vehicle_reg",
            "account_id",
            "owner_name",
            "issued_at",
            "created_at",
        ]


class EBoarderDetailSerializer(EBoarderListSerializer):
    class Meta(EBoarderListSerializer.Meta):
        fields = [*EBoarderListSerializer.Meta.fields, "raw", "updated_at"]


class EBoarderWriteSerializer(serializers.Serializer):
    serial = serializers.CharField(max_length=64)
    make = serializers.CharField(required=False, allow_blank=True, max_length=80)
    model = serializers.CharField(max_length=80)
    rated_watts = serializers.IntegerField(min_value=1)
    petrol_hp_equivalent = serializers.CharField(
        required=False, allow_blank=True, max_length=20
    )
    nominal_voltage_v = serializers.IntegerField(required=False, min_value=12)
    battery_type = serializers.PrimaryKeyRelatedField(
        queryset=BatteryType.objects.all()
    )
    shaft_length = serializers.ChoiceField(
        choices=EBoarder.ShaftLength.choices, required=False
    )
    status = serializers.ChoiceField(
        choices=EBoarder.Status.choices, required=False
    )
    current_hub = serializers.PrimaryKeyRelatedField(
        queryset=Hub.objects.all(), required=False, allow_null=True
    )
    raw = serializers.DictField(required=False)
