from __future__ import annotations

import django_filters

from risk.models import RiskEvent


class RiskEventFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")
    status = django_filters.CharFilter(field_name="status")
    severity = django_filters.CharFilter(field_name="severity")
    rule = django_filters.CharFilter(field_name="rule__code")
    subject_type = django_filters.CharFilter(field_name="subject_type")
    subject_id = django_filters.CharFilter(field_name="subject_id")
    start_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date__gte"
    )
    end_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date__lte"
    )

    class Meta:
        model = RiskEvent
        fields = [
            "account",
            "status",
            "severity",
            "rule",
            "subject_type",
            "subject_id",
            "start_date",
            "end_date",
        ]
