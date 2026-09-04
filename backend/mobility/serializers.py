from rest_framework import serializers
from .models import (
    BatteryType, Hub, Battery, HubSlot, VehicleModel,
    Vehicle, Plan, Subscription, Reservation, Swap
)

class BatteryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatteryType
        fields = '__all__'

class BatterySerializer(serializers.ModelSerializer):
    battery_type_name = serializers.CharField(source='battery_type.name', read_only=True)
    hub_name = serializers.CharField(source='current_hub.name', read_only=True)

    class Meta:
        model = Battery
        fields = '__all__'

class HubSlotSerializer(serializers.ModelSerializer):
    battery = BatterySerializer(read_only=True)

    class Meta:
        model = HubSlot
        fields = ['id', 'slot_no', 'state', 'battery']

class HubSerializer(serializers.ModelSerializer):
    ready_count = serializers.SerializerMethodField()
    charging_count = serializers.SerializerMethodField()
    slots = HubSlotSerializer(many=True, read_only=True)

    class Meta:
        model = Hub
        fields = ['id', 'code', 'name', 'address', 'lat', 'lng', 'slot_count', 'solar_capacity_kw', 'status', 'ready_count', 'charging_count', 'slots']

    def get_ready_count(self, obj) -> int:
        return obj.slots.filter(state=HubSlot.State.READY).count()

    def get_charging_count(self, obj) -> int:
        return obj.slots.filter(state=HubSlot.State.CHARGING).count()

class VehicleModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleModel
        fields = '__all__'

class VehicleSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='vehicle_model.model', read_only=True)
    make = serializers.CharField(source='vehicle_model.make', read_only=True)
    vehicle_type = serializers.CharField(source='vehicle_model.vehicle_type', read_only=True)
    current_battery_serial = serializers.CharField(source='current_battery.serial', read_only=True)
    current_battery_charge = serializers.IntegerField(source='current_battery.charge_pct', read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'account', 'vehicle_model', 'make', 'model_name', 'vehicle_type',
            'registration_plate', 'current_battery', 'current_battery_serial',
            'current_battery_charge', 'status'
        ]

class PlanSerializer(serializers.ModelSerializer):
    price_naira = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = ['id', 'code', 'name', 'vehicle_type', 'duration_days', 'swap_allowance', 'price_kobo', 'price_naira', 'is_active']

    def get_price_naira(self, obj) -> float:
        return obj.price_kobo / 100.0

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.registration_plate', read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'

class ReservationSerializer(serializers.ModelSerializer):
    hub_name = serializers.CharField(source='hub.name', read_only=True)
    hub_code = serializers.CharField(source='hub.code', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.registration_plate', read_only=True)
    driver_name = serializers.CharField(source='driver.user.first_name', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'account', 'vehicle', 'vehicle_plate', 'driver', 'driver_name',
            'hub', 'hub_name', 'hub_code', 'battery', 'code', 'status', 'payment_mode',
            'expires_at', 'created_at'
        ]

class SwapSerializer(serializers.ModelSerializer):
    hub_name = serializers.CharField(source='hub.name', read_only=True)
    hub_code = serializers.CharField(source='hub.code', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.registration_plate', read_only=True)
    driver_phone = serializers.CharField(source='driver.user.phone', read_only=True)
    returned_serial = serializers.CharField(source='returned_battery.serial', read_only=True)
    issued_serial = serializers.CharField(source='issued_battery.serial', read_only=True)

    class Meta:
        model = Swap
        fields = [
            'id', 'reservation', 'account', 'vehicle', 'vehicle_plate', 'driver',
            'driver_phone', 'hub', 'hub_name', 'hub_code', 'agent',
            'returned_serial', 'returned_charge_pct', 'issued_serial', 'issued_charge_pct',
            'payment_mode', 'amount_kobo', 'vat_kobo', 'mismatch_flag', 'status', 'created_at'
        ]

class SwapCompleteRequestSerializer(serializers.Serializer):
    reservation_id = serializers.UUIDField(required=False, allow_null=True)
    hub_id = serializers.UUIDField(required=True)
    vehicle_id = serializers.UUIDField(required=True)
    driver_id = serializers.UUIDField(required=True)
    account_id = serializers.UUIDField(required=True)
    returned_battery_serial = serializers.CharField(required=True)
    issued_battery_serial = serializers.CharField(required=True)
    returned_charge_pct = serializers.IntegerField(default=15)
    issued_charge_pct = serializers.IntegerField(default=100)
    amount_kobo = serializers.IntegerField(default=150000)
