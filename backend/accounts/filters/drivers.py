from __future__ import annotations

import django_filters

from accounts.models import Driver


class DriverFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")
    status = django_filters.CharFilter(field_name="status")
    user = django_filters.UUIDFilter(field_name="user_id")

    class Meta:
        model = Driver
        fields = ["account", "status", "user"]
