"""
Portable in-app notifications.

Copy this package into another Django project, register in INSTALLED_APPS,
include `notifications.urls`, and call NotificationService.notify().
"""
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"
    verbose_name = "Notifications"
