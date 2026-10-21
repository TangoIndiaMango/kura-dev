from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import django_filters
from django.conf import settings
from django.db.models import Q

from finance.models import Payment


def _local_midnight(day):
    tz = ZoneInfo(getattr(settings, "DISPLAY_TIME_ZONE", "Africa/Lagos"))
    return datetime.combine(day, time.min, tzinfo=tz)


class PaymentFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")
    status = django_filters.CharFilter(field_name="status")
    channel = django_filters.CharFilter(field_name="channel")
    purpose = django_filters.CharFilter(field_name="purpose")
    hub = django_filters.UUIDFilter(field_name="hub_id")
    search = django_filters.CharFilter(method="filter_search")
    # Hub-local (Lagos) days: TIME_ZONE is UTC, so `created_at__date` would put a
    # 00:30 WAT cash swap on the previous day's statement.
    start_date = django_filters.DateFilter(method="filter_start_date")
    end_date = django_filters.DateFilter(method="filter_end_date")

    def filter_search(self, qs, name, value):
        term = value.strip()
        if not term:
            return qs
        return qs.filter(
            Q(receipt_code__icontains=term)
            | Q(account__display_name__icontains=term)
            | Q(account__kura_id__icontains=term)
        )

    def filter_start_date(self, qs, name, value):
        return qs.filter(created_at__gte=_local_midnight(value))

    def filter_end_date(self, qs, name, value):
        return qs.filter(created_at__lt=_local_midnight(value + timedelta(days=1)))

    class Meta:
        model = Payment
        fields = [
            "account",
            "status",
            "channel",
            "purpose",
            "hub",
            "search",
            "start_date",
            "end_date",
        ]
