from django.contrib import admin
from .models import User, Account, Consent, Driver, StaffMembership

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'phone', 'first_name', 'last_name', 'role', 'is_active']
    search_fields = ['email', 'phone', 'first_name', 'last_name']
    list_filter = ['role', 'is_active', 'is_staff']

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['kura_id', 'display_name', 'kind', 'status', 'kyc_status', 'created_at']
    search_fields = ['kura_id', 'display_name']
    list_filter = ['kind', 'status', 'kyc_status']

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['user', 'account', 'license_number', 'status']

@admin.register(StaffMembership)
class StaffMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'hub_id']

@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ['account', 'purpose', 'policy_version', 'channel', 'granted_at', 'withdrawn_at']
    list_filter = ['purpose', 'policy_version', 'channel']
    search_fields = ['account__kura_id', 'account__display_name']
    readonly_fields = ['account', 'purpose', 'policy_version', 'channel', 'granted_at', 'withdrawn_at']
