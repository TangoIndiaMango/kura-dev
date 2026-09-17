from django.contrib import admin

from support.models import CaseEvent, SupportCase


@admin.register(SupportCase)
class SupportCaseAdmin(admin.ModelAdmin):
    list_display = ["code", "account", "kind", "priority", "status", "created_at"]
    list_filter = ["status", "kind", "priority"]
    search_fields = ["code", "subject"]


@admin.register(CaseEvent)
class CaseEventAdmin(admin.ModelAdmin):
    list_display = ["case", "kind", "actor", "created_at"]
