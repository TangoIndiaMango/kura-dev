"""
Portable audit trail app.

Copy this package into another Django project, add to INSTALLED_APPS,
include `audit.urls` under your API prefix, and call AuditService.record().
"""
from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "audit"
    verbose_name = "Audit"
