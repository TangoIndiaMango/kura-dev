from django.contrib import admin
from .models import Shift, Override, Alert

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['agent', 'hub', 'opened_at', 'status']

@admin.register(Override)
class OverrideAdmin(admin.ModelAdmin):
    list_display = ['swap', 'agent', 'reason', 'created_at']

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['kind', 'severity', 'hub', 'is_resolved', 'created_at']
    list_filter = ['severity', 'is_resolved', 'kind']
