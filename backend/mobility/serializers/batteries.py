"""Battery serializers — list columns; detail adds custody ids."""
from __future__ import annotations

from rest_framework import serializers

from mobility.models import Battery
from mobility.models import BatteryEvent


class BatteryListSerializer(serializers.ModelSerializer):
    battery_type_name = serializers.CharField(
        source="battery_type.name", read_only=True
    )
    hub_code = serializers.CharField(
        source="current_hub.code", read_only=True, allow_null=True, default=None
    )
    hub_name = serializers.CharField(
        source="current_hub.name", read_only=True, allow_null=True, default=None
    )

    class Meta:
        model = Battery
        fields = [
            "id",
            "serial",
            "battery_type_id",
            "battery_type_name",
            "status",
            "charge_pct",
            "charge_source",
            "health_pct",
            "cycle_count",
            "manufactured_at",
            "current_hub_id",
            "hub_code",
            "hub_name",
            "custodian_type",
            "created_at",
        ]


class BatteryDetailSerializer(BatteryListSerializer):
    vehicle_id = serializers.SerializerMethodField()

    class Meta(BatteryListSerializer.Meta):
        fields = BatteryListSerializer.Meta.fields + [
            "custodian_id",
            "vehicle_id",
            "issued_at",
            "expected_return_by",
            "updated_at",
        ]

    def get_vehicle_id(self, obj: Battery):
        mounted = getattr(obj, "mounted_vehicle", None)
        return str(mounted.id) if mounted is not None else None


class BatteryWriteSerializer(serializers.Serializer):
    serial = serializers.CharField(max_length=50, required=False)
    battery_type_id = serializers.UUIDField(required=False)
    current_hub_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=Battery.Status.choices, required=False
    )
    charge_pct = serializers.IntegerField(
        required=False, min_value=0, max_value=100
    )
    charge_source = serializers.ChoiceField(
        choices=Battery.ChargeSource.choices, required=False
    )
    health_pct = serializers.IntegerField(
        required=False, min_value=0, max_value=100
    )
    cycle_count = serializers.IntegerField(required=False, min_value=0)
    manufactured_at = serializers.DateField(required=False, allow_null=True)


class BatteryStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Battery.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    current_hub_id = serializers.UUIDField(required=False, allow_null=True)


class BatteryTransferSerializer(serializers.Serializer):
    destination = serializers.ChoiceField(
        choices=["hub", "workshop", "transit"]
    )
    hub_id = serializers.UUIDField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class BatteryNoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")


class BatteryEventSerializer(serializers.ModelSerializer):
    actor_label = serializers.SerializerMethodField()
    hub_code = serializers.CharField(
        source="hub.code", read_only=True, allow_null=True, default=None
    )

    class Meta:
        model = BatteryEvent
        fields = [
            "id",
            "event",
            "from_custodian_type",
            "from_custodian_id",
            "to_custodian_type",
            "to_custodian_id",
            "hub_id",
            "hub_code",
            "swap_id",
            "charge_pct",
            "meta",
            "occurred_at",
            "recorded_at",
            "source",
            "actor_label",
            "prev_hash",
            "row_hash",
        ]

    def get_actor_label(self, obj: BatteryEvent) -> str:
        actor = obj.actor
        if actor is None:
            return "System"
        return (
            getattr(actor, "email", None)
            or getattr(actor, "phone", None)
            or str(actor.pk)[:8]
        )
