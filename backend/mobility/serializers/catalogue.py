"""Battery, vehicle, plan, reservation, and swap serializers."""
from rest_framework import serializers

from mobility.models import (
    Battery,
    BatteryType,
    Plan,
    Reservation,
    Subscription,
    Swap,
    Vehicle,
    VehicleModel,
)
from mobility.services.reservations.qr_token import reveal_reservation_qr


class BatteryTypeSerializer(serializers.ModelSerializer):
    vehicle_type = serializers.CharField(max_length=50)

    class Meta:
        model = BatteryType
        fields = [
            "id",
            "name",
            "manufacturer",
            "capacity_kwh",
            "nominal_voltage",
            "vehicle_type",
            "qr_scheme",
            "status",
            "created_by",
            "approved_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "approved_by",
            "created_at",
            "updated_at",
        ]


class BatterySerializer(serializers.ModelSerializer):
    battery_type_name = serializers.CharField(source="battery_type.name", read_only=True)
    hub_name = serializers.CharField(source="current_hub.name", read_only=True)

    class Meta:
        model = Battery
        fields = [
            "id",
            "serial",
            "battery_type",
            "battery_type_name",
            "status",
            "charge_pct",
            "health_pct",
            "cycle_count",
            "current_hub",
            "hub_name",
            "created_at",
            "updated_at",
        ]


class VehicleModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleModel
        fields = [
            "id",
            "make",
            "model",
            "vehicle_type",
            "battery_type",
            "created_at",
            "updated_at",
        ]


class VehicleSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source="vehicle_model.model", read_only=True)
    make = serializers.CharField(source="vehicle_model.make", read_only=True)
    vehicle_type = serializers.CharField(
        source="vehicle_model.vehicle_type", read_only=True
    )
    current_battery_serial = serializers.CharField(
        source="current_battery.serial", read_only=True
    )
    current_battery_charge = serializers.IntegerField(
        source="current_battery.charge_pct", read_only=True
    )

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "account",
            "vehicle_model",
            "make",
            "model_name",
            "vehicle_type",
            "registration_plate",
            "current_battery",
            "current_battery_serial",
            "current_battery_charge",
            "status",
        ]


class PlanSerializer(serializers.ModelSerializer):
    active_subscriber_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Plan
        fields = [
            "id",
            "code",
            "name",
            "vehicle_type",
            "period",
            "duration_days",
            "swap_allowance",
            "price_kobo",
            "description",
            "auto_renew_default",
            "status",
            "is_active",
            "created_at",
            "active_subscriber_count",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True)
    vehicle_id = serializers.UUIDField(read_only=True)
    plan_id = serializers.UUIDField(read_only=True)
    queued_plan_id = serializers.UUIDField(read_only=True, allow_null=True)
    payment_id = serializers.UUIDField(read_only=True, allow_null=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    plan_code = serializers.CharField(source="plan.code", read_only=True)
    plan_period = serializers.CharField(source="plan.period", read_only=True)
    vehicle_plate = serializers.CharField(
        source="vehicle.registration_plate", read_only=True
    )
    account_name = serializers.CharField(
        source="account.display_name", read_only=True
    )
    account_kura_id = serializers.CharField(source="account.kura_id", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "account_id",
            "vehicle_id",
            "plan_id",
            "queued_plan_id",
            "payment_id",
            "plan_name",
            "plan_code",
            "plan_period",
            "vehicle_plate",
            "account_name",
            "account_kura_id",
            "starts_at",
            "ends_at",
            "swaps_used",
            "swaps_allowance",
            "status",
            "auto_renew",
            "list_price_kobo",
            "discount_kobo",
            "amount_kobo",
            "discount_code",
            "created_at",
        ]
        read_only_fields = fields


class ReservationSerializer(serializers.ModelSerializer):
    hub_name = serializers.CharField(source="hub.name", read_only=True)
    hub_code = serializers.CharField(source="hub.code", read_only=True)
    vehicle_plate = serializers.CharField(
        source="vehicle.registration_plate", read_only=True
    )
    driver_name = serializers.CharField(
        source="driver.user.first_name", read_only=True
    )
    qr = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "account",
            "vehicle",
            "vehicle_plate",
            "driver",
            "driver_name",
            "hub",
            "hub_name",
            "hub_code",
            "battery",
            "code",
            "qr",
            "status",
            "payment_mode",
            "hold_amount_kobo",
            "list_price_kobo",
            "discount_code",
            "discount_kobo",
            "expires_at",
            "created_at",
        ]

    def get_qr(self, obj: Reservation) -> str | None:
        return reveal_reservation_qr(obj)


class SwapSerializer(serializers.ModelSerializer):
    hub_name = serializers.CharField(source="hub.name", read_only=True)
    hub_code = serializers.CharField(source="hub.code", read_only=True)
    vehicle_plate = serializers.CharField(
        source="vehicle.registration_plate", read_only=True
    )
    driver_phone = serializers.CharField(source="driver.user.phone", read_only=True)
    returned_serial = serializers.SerializerMethodField()
    issued_serial = serializers.SerializerMethodField()
    payment_id = serializers.SerializerMethodField()
    display_amount_kobo = serializers.SerializerMethodField()
    ui_status = serializers.SerializerMethodField()
    reservation_status = serializers.SerializerMethodField()
    reservation_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = Swap
        fields = [
            "id",
            "reservation",
            "account",
            "vehicle",
            "vehicle_plate",
            "driver",
            "driver_phone",
            "hub",
            "hub_name",
            "hub_code",
            "agent",
            "returned_serial",
            "returned_charge_pct",
            "issued_serial",
            "issued_charge_pct",
            "payment_mode",
            "amount_kobo",
            "display_amount_kobo",
            "vat_kobo",
            "payment",
            "payment_id",
            "subscription",
            "override_id",
            "mismatch_flag",
            "mismatch_reason",
            "status",
            "ui_status",
            "reservation_status",
            "reservation_expires_at",
            "client_event_id",
            "started_at",
            "completed_at",
            "created_at",
        ]

    override_id = serializers.SerializerMethodField()

    def get_override_id(self, obj: Swap):
        info = getattr(obj, "override_info", None)
        return str(info.id) if info is not None else None

    def get_returned_serial(self, obj: Swap) -> str | None:
        bat = obj.returned_battery
        return bat.serial if bat is not None else None

    def get_issued_serial(self, obj: Swap) -> str | None:
        bat = obj.issued_battery
        return bat.serial if bat is not None else None

    def get_payment_id(self, obj: Swap) -> str | None:
        if obj.payment_id is None:
            return None
        return str(obj.payment_id)

    def get_display_amount_kobo(self, obj: Swap) -> int:
        from mobility.helpers.swap_display import swap_display_amount_kobo

        return swap_display_amount_kobo(obj)

    def get_ui_status(self, obj: Swap) -> str:
        from mobility.helpers.swap_display import swap_ui_status

        return swap_ui_status(obj)

    def get_reservation_status(self, obj: Swap) -> str:
        from mobility.helpers.swap_display import reservation_effective_status

        return reservation_effective_status(getattr(obj, "reservation", None))

    def get_reservation_expires_at(self, obj: Swap) -> str | None:
        reservation = getattr(obj, "reservation", None)
        if reservation is None or not reservation.expires_at:
            return None
        return reservation.expires_at.isoformat().replace("+00:00", "Z")


class SwapOverrideSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=50)
    note = serializers.CharField(max_length=2000)
    agent_pin_grant = serializers.CharField(required=True, allow_blank=False)


class SwapCompleteRequestSerializer(serializers.Serializer):
    reservation_id = serializers.UUIDField(required=False, allow_null=True)
    hub_id = serializers.UUIDField(required=True)
    vehicle_id = serializers.UUIDField(required=True)
    driver_id = serializers.UUIDField(required=True)
    account_id = serializers.UUIDField(required=True)
    returned_battery_serial = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, default=""
    )
    issued_battery_serial = serializers.CharField(required=True)
    returned_charge_pct = serializers.IntegerField(default=15)
    issued_charge_pct = serializers.IntegerField(default=100)
    amount_kobo = serializers.IntegerField(required=False, allow_null=True)
    payment_mode = serializers.ChoiceField(
        choices=["PLAN", "WALLET", "CREDIT", "CASH"],
        required=False,
        allow_null=True,
    )
    discount_code = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=40
    )
    rider_pin_grant = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    override = SwapOverrideSerializer(required=False, allow_null=True)


class RiderPinVerifySerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    pin = serializers.CharField(min_length=4, max_length=8)


class ReservationLookupRequestSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True, default="")
    code = serializers.CharField(required=False, allow_blank=True, default="")
    vehicle_qr = serializers.CharField(required=False, allow_blank=True, default="")
    hub_id = serializers.UUIDField(required=False, allow_null=True)


class SwapStartRequestSerializer(serializers.Serializer):
    hub_id = serializers.UUIDField()
    client_event_id = serializers.CharField(max_length=100)
    reservation_id = serializers.UUIDField(required=False, allow_null=True)
    vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    vehicle_qr = serializers.CharField(required=False, allow_blank=True, default="")
    driver_id = serializers.UUIDField(required=False, allow_null=True)
    account_id = serializers.UUIDField(required=False, allow_null=True)


class SwapReturnRequestSerializer(serializers.Serializer):
    battery_serial = serializers.CharField()
    charge_pct = serializers.IntegerField(default=15, min_value=0, max_value=100)
    mismatch_reason = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=40
    )


class SwapIssueRequestSerializer(serializers.Serializer):
    battery_serial = serializers.CharField()
    charge_pct = serializers.IntegerField(default=100, min_value=0, max_value=100)


class SwapAbortRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class SwapReverseRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False, max_length=400)


class IdentityMismatchRequestSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    subject = serializers.CharField(required=False, allow_blank=True, default="")
    reason = serializers.CharField(required=True, allow_blank=False, max_length=400)
    hub_id = serializers.UUIDField(required=False, allow_null=True)
    reservation_code = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=40
    )


class SwapSessionCompleteSerializer(serializers.Serializer):
    payment_mode = serializers.ChoiceField(
        choices=["PLAN", "WALLET", "CREDIT", "CASH"],
        required=False,
        allow_null=True,
    )
    amount_kobo = serializers.IntegerField(required=False, allow_null=True)
    discount_code = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=40
    )
    rider_pin_grant = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    override = SwapOverrideSerializer(required=False, allow_null=True)
