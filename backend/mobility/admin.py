from django.contrib import admin

from .models import (
    Battery,
    BatteryEvent,
    BatteryType,
    BayHoldPolicy,
    Hub,
    HubSlot,
    Plan,
    PriceMatrix,
    Reservation,
    Subscription,
    Swap,
    Vehicle,
    VehicleModel,
)


@admin.register(Hub)
class HubAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status", "slot_count", "solar_capacity_kw"]
    search_fields = ["code", "name"]
    list_filter = ["status"]


@admin.register(Battery)
class BatteryAdmin(admin.ModelAdmin):
    list_display = [
        "serial",
        "battery_type",
        "status",
        "custodian_type",
        "charge_pct",
        "health_pct",
        "cycle_count",
        "current_hub",
    ]
    search_fields = ["serial"]
    list_filter = ["status", "custodian_type", "battery_type", "current_hub"]
    readonly_fields = ["qr_secret"]


@admin.register(BatteryEvent)
class BatteryEventAdmin(admin.ModelAdmin):
    list_display = [
        "battery",
        "event",
        "from_custodian_type",
        "to_custodian_type",
        "hub",
        "occurred_at",
        "source",
    ]
    list_filter = ["event", "source"]
    search_fields = ["battery__serial"]
    readonly_fields = [
        "battery",
        "event",
        "from_custodian_type",
        "from_custodian_id",
        "to_custodian_type",
        "to_custodian_id",
        "actor",
        "hub",
        "swap",
        "charge_pct",
        "meta",
        "occurred_at",
        "recorded_at",
        "source",
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HubSlot)
class HubSlotAdmin(admin.ModelAdmin):
    list_display = ["hub", "slot_no", "state", "battery"]
    list_filter = ["hub", "state"]


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = [
        "registration_plate",
        "vehicle_model",
        "account",
        "current_battery",
        "status",
    ]
    search_fields = ["registration_plate"]
    list_filter = ["status", "vehicle_model"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "name",
        "vehicle_type",
        "period",
        "duration_days",
        "price_kobo",
        "status",
    ]


@admin.register(PriceMatrix)
class PriceMatrixAdmin(admin.ModelAdmin):
    list_display = [
        "vehicle_type",
        "pay_per_swap_kobo",
        "daily_kobo",
        "weekly_kobo",
        "monthly_kobo",
        "effective_from",
        "status",
    ]
    list_filter = ["status", "vehicle_type"]


@admin.register(BayHoldPolicy)
class BayHoldPolicyAdmin(admin.ModelAdmin):
    list_display = ["default_hold_minutes", "max_extend_minutes", "updated_at"]


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "vehicle",
        "driver",
        "hub",
        "status",
        "hold_amount_kobo",
        "expires_at",
    ]
    search_fields = ["code"]
    list_filter = ["status", "hub"]


@admin.register(Swap)
class SwapAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "vehicle",
        "hub",
        "returned_battery",
        "issued_battery",
        "mismatch_flag",
        "status",
        "created_at",
    ]
    search_fields = ["vehicle__registration_plate"]
    list_filter = ["mismatch_flag", "status", "hub"]


admin.site.register(BatteryType)
admin.site.register(VehicleModel)
admin.site.register(Subscription)
