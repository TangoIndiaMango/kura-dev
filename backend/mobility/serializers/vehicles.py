"""Vehicle list / detail / write serializers — IDs for cross-module FKs."""
from __future__ import annotations

from rest_framework import serializers

from mobility.models import Vehicle, VehicleModel, VehicleType


class VehicleListSerializer(serializers.ModelSerializer):
    make = serializers.CharField(source="vehicle_model.make", read_only=True)
    model_name = serializers.CharField(source="vehicle_model.model", read_only=True)
    vehicle_type = serializers.CharField(
        source="vehicle_model.vehicle_type", read_only=True
    )
    battery_type_name = serializers.CharField(
        source="vehicle_model.battery_type.name", read_only=True
    )
    account_id = serializers.UUIDField(source="account.id", read_only=True)
    owner_name = serializers.CharField(
        source="account.display_name", read_only=True
    )
    owner_kura_id = serializers.CharField(source="account.kura_id", read_only=True)
    current_battery_serial = serializers.CharField(
        source="current_battery.serial", read_only=True, allow_null=True
    )
    current_battery_charge = serializers.IntegerField(
        source="current_battery.charge_pct", read_only=True, allow_null=True
    )
    current_battery_charge_source = serializers.CharField(
        source="current_battery.charge_source", read_only=True, allow_null=True
    )
    current_battery_charge_at = serializers.DateTimeField(
        source="current_battery.charge_observed_at", read_only=True, allow_null=True
    )
    assigned_driver_id = serializers.UUIDField(
        source="assigned_driver.id", read_only=True, allow_null=True
    )
    assigned_driver_name = serializers.SerializerMethodField()
    estimated_range_km = serializers.SerializerMethodField()
    pay_per_swap_kobo = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "registration_plate",
            "make",
            "model_name",
            "vehicle_type",
            "battery_type_name",
            "account_id",
            "owner_name",
            "owner_kura_id",
            "current_battery_serial",
            "current_battery_charge",
            "current_battery_charge_source",
            "current_battery_charge_at",
            "assigned_driver_id",
            "assigned_driver_name",
            "estimated_range_km",
            "pay_per_swap_kobo",
            "hardware_id",
            "vin",
            "status",
            "created_at",
        ]

    def get_assigned_driver_name(self, obj: Vehicle) -> str | None:
        driver = getattr(obj, "assigned_driver", None)
        if driver is None:
            return None
        user = getattr(driver, "user", None)
        if user is None:
            return None
        name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
        return name or (user.phone or None)

    def get_estimated_range_km(self, obj: Vehicle) -> int | None:
        from mobility.services.range_estimate import estimate_range_km

        return estimate_range_km(battery=obj.current_battery)

    def get_pay_per_swap_kobo(self, obj: Vehicle) -> int | None:
        vehicle_type = obj.vehicle_model.vehicle_type if obj.vehicle_model_id else None
        if not vehicle_type:
            return None
        cache: dict[str, int | None] = self.context.setdefault("_pps_cache", {})
        if vehicle_type not in cache:
            from core.exceptions import DomainError
            from mobility.services.plans.pricing import PricingService

            try:
                cache[vehicle_type] = PricingService.resolve_pps_kobo(
                    vehicle_type=vehicle_type
                )
            except DomainError:
                cache[vehicle_type] = None
        return cache[vehicle_type]


class VehicleDetailSerializer(VehicleListSerializer):
    vehicle_model_id = serializers.UUIDField(
        source="vehicle_model.id", read_only=True
    )
    current_battery_id = serializers.UUIDField(
        source="current_battery.id", read_only=True, allow_null=True
    )
    petrol_engine_id = serializers.UUIDField(
        source="petrol_engine.id", read_only=True, allow_null=True
    )
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta(VehicleListSerializer.Meta):
        fields = [
            *VehicleListSerializer.Meta.fields,
            "vehicle_model_id",
            "current_battery_id",
            "petrol_engine_id",
            "acquisition_path",
            "updated_at",
        ]


class VehicleWriteSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    vehicle_model_id = serializers.UUIDField(required=False)
    registration_plate = serializers.CharField(max_length=30, required=False)
    hardware_id = serializers.CharField(
        max_length=64, required=False, allow_blank=True, allow_null=True
    )
    vin = serializers.CharField(max_length=32, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Vehicle.Status.choices, required=False
    )

    def validate(self, attrs):
        if self.partial:
            return attrs
        missing = [
            k
            for k in ("account_id", "vehicle_model_id", "registration_plate")
            if k not in attrs or attrs.get(k) in (None, "")
        ]
        if missing:
            raise serializers.ValidationError(
                {k: "This field is required." for k in missing}
            )
        return attrs



class VehicleStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Vehicle.Status.choices)


class VehicleNoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class VehicleAssignDriverSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class VehicleAssignmentHistorySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    driver_id = serializers.UUIDField()
    driver_name = serializers.CharField()
    driver_phone = serializers.CharField(allow_null=True)
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField(allow_null=True)
    note = serializers.CharField()


class VehicleCommandSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=[
            "ENABLE_DRIVING",
            "DISABLE_DRIVING",
            "REQUEST_STATE",
            "UNLOCK_BATTERY",
            "DRAW_ATTENTION",
        ]
    )
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class VehicleModelListSerializer(serializers.ModelSerializer):
    battery_type_name = serializers.CharField(
        source="battery_type.name", read_only=True
    )
    battery_type_id = serializers.UUIDField(source="battery_type.id", read_only=True)

    class Meta:
        model = VehicleModel
        fields = [
            "id",
            "make",
            "model",
            "vehicle_type",
            "battery_type",
            "battery_type_id",
            "battery_type_name",
            "service_interval_km",
            "service_interval_days",
            "created_at",
            "updated_at",
        ]


class VehicleModelWriteSerializer(serializers.Serializer):
    make = serializers.CharField(max_length=100)
    model = serializers.CharField(max_length=100)
    vehicle_type = serializers.CharField(max_length=50)
    battery_type = serializers.UUIDField()
    service_interval_km = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    service_interval_days = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )


class HubDiscoverSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    address = serializers.CharField()
    status = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    ready_count = serializers.IntegerField()
    hours_label = serializers.CharField(allow_blank=True)
