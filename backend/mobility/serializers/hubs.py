"""Hub serializers — list columns only; slots via dedicated action."""
from __future__ import annotations

from rest_framework import serializers

from mobility.models import Hub, HubSlot


class HubSlotListSerializer(serializers.ModelSerializer):
    battery_serial = serializers.CharField(
        source="battery.serial", read_only=True, allow_null=True, default=None
    )
    battery_charge_pct = serializers.IntegerField(
        source="battery.charge_pct", read_only=True, allow_null=True, default=None
    )

    class Meta:
        model = HubSlot
        fields = [
            "id",
            "slot_no",
            "state",
            "battery_id",
            "battery_serial",
            "battery_charge_pct",
        ]


class HubListSerializer(serializers.ModelSerializer):
    ready_count = serializers.IntegerField(read_only=True, default=0)
    charging_count = serializers.IntegerField(read_only=True, default=0)
    empty_count = serializers.IntegerField(read_only=True, default=0)
    fault_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Hub
        fields = [
            "id",
            "code",
            "name",
            "address",
            "status",
            "slot_count",
            "solar_capacity_kw",
            "ready_count",
            "charging_count",
            "empty_count",
            "fault_count",
            "created_at",
        ]


class HubDetailSerializer(HubListSerializer):
    class Meta(HubListSerializer.Meta):
        fields = HubListSerializer.Meta.fields + [
            "lat",
            "lng",
            "timezone",
            "operating_hours",
            "last_sync_at",
            "updated_at",
        ]


class HubWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30, required=False)
    name = serializers.CharField(max_length=150)
    address = serializers.CharField(max_length=255)
    lat = serializers.FloatField(required=False, default=6.5173)
    lng = serializers.FloatField(required=False, default=3.3734)
    slot_count = serializers.IntegerField(
        required=False, min_value=1, max_value=128, default=16
    )
    solar_capacity_kw = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, default="12.50"
    )
    status = serializers.ChoiceField(
        choices=Hub.Status.choices, required=False, default=Hub.Status.ONLINE
    )
    timezone = serializers.CharField(required=False, default="Africa/Lagos")
    operating_hours = serializers.JSONField(required=False)

class HubStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Hub.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")
