from __future__ import annotations

import django_filters

from operations.models import Shift


class ShiftFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    hub = django_filters.UUIDFilter(field_name="hub_id")
    agent = django_filters.UUIDFilter(field_name="agent_id")
    start_date = django_filters.DateFilter(
        field_name="opened_at", lookup_expr="date__gte"
    )
    end_date = django_filters.DateFilter(
        field_name="opened_at", lookup_expr="date__lte"
    )

    class Meta:
        model = Shift
        fields = ["status", "hub", "agent", "start_date", "end_date"]
