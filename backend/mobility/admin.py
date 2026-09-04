from django.contrib import admin
from .models import (
    BatteryType, Hub, Battery, HubSlot, VehicleModel,
    Vehicle, Plan, Subscription, Reservation, Swap
)

@admin.register(Hub)
class HubAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'status', 'slot_count', 'solar_capacity_kw']
    search_fields = ['code', 'name']
    list_filter = ['status']

@admin.register(Battery)
class BatteryAdmin(admin.ModelAdmin):
    list_display = ['serial', 'battery_type', 'status', 'charge_pct', 'health_pct', 'cycle_count', 'current_hub']
    search_fields = ['serial']
    list_filter = ['status', 'battery_type', 'current_hub']

@admin.register(HubSlot)
class HubSlotAdmin(admin.ModelAdmin):
    list_display = ['hub', 'slot_no', 'state', 'battery']
    list_filter = ['hub', 'state']

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['registration_plate', 'vehicle_model', 'account', 'current_battery', 'status']
    search_fields = ['registration_plate']
    list_filter = ['status', 'vehicle_model']

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'vehicle_type', 'duration_days', 'price_kobo', 'is_active']

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['code', 'vehicle', 'driver', 'hub', 'status', 'expires_at']
    search_fields = ['code']
    list_filter = ['status', 'hub']

@admin.register(Swap)
class SwapAdmin(admin.ModelAdmin):
    list_display = ['id', 'vehicle', 'hub', 'returned_battery', 'issued_battery', 'mismatch_flag', 'status', 'created_at']
    search_fields = ['vehicle__registration_plate']
    list_filter = ['mismatch_flag', 'status', 'hub']

admin.site.register(BatteryType)
admin.site.register(VehicleModel)
admin.site.register(Subscription)
