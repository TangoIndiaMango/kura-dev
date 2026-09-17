from django.contrib import admin

from risk.models import RiskEvent, RiskRule


@admin.register(RiskRule)
class RiskRuleAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "severity", "action", "enabled"]
    list_filter = ["enabled", "severity"]


@admin.register(RiskEvent)
class RiskEventAdmin(admin.ModelAdmin):
    list_display = ["rule", "account", "severity", "status", "created_at"]
    list_filter = ["status", "severity"]
    search_fields = ["subject_id", "rule__code"]
