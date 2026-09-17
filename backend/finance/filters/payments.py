from __future__ import annotations

import django_filters

from finance.models import Payment


class PaymentFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")
    status = django_filters.CharFilter(field_name="status")
    channel = django_filters.CharFilter(field_name="channel")
    purpose = django_filters.CharFilter(field_name="purpose")

    class Meta:
        model = Payment
        fields = ["account", "status", "channel", "purpose"]
