from __future__ import annotations

import django_filters

from operations.models import Alert


class AlertFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    severity = django_filters.CharFilter(field_name="severity")
    kind = django_filters.CharFilter(field_name="kind")
    hub = django_filters.UUIDFilter(field_name="hub_id")
    is_resolved = django_filters.BooleanFilter(field_name="is_resolved")
    start_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date__gte"
    )
    end_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date__lte"
    )

    class Meta:
        model = Alert
        fields = [
            "status",
            "severity",
            "kind",
            "hub",
            "is_resolved",
            "start_date",
            "end_date",
        ]
