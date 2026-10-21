from __future__ import annotations

from datetime import datetime, time, timedelta

import django_filters
from django.db.models import Q
from django.utils import timezone

from operations.models import Shift


def _midnight(day):
    return timezone.make_aware(datetime.combine(day, time.min))


class ShiftFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    hub = django_filters.UUIDFilter(field_name="hub_id")
    agent = django_filters.UUIDFilter(field_name="agent_id")
    # A duty window belongs to every day it overlaps — a shift opened before the
    # range and still open must show, or its cash vanishes from reconciliation.
    start_date = django_filters.DateFilter(method="filter_start_date")
    end_date = django_filters.DateFilter(method="filter_end_date")

    def filter_start_date(self, qs, name, value):
        return qs.filter(Q(closed_at__isnull=True) | Q(closed_at__gte=_midnight(value)))

    def filter_end_date(self, qs, name, value):
        return qs.filter(opened_at__lt=_midnight(value + timedelta(days=1)))

    class Meta:
        model = Shift
        fields = ["status", "hub", "agent", "start_date", "end_date"]
