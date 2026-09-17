from __future__ import annotations

import django_filters

from support.models import SupportCase


class SupportCaseFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")
    status = django_filters.CharFilter(field_name="status")
    kind = django_filters.CharFilter(field_name="kind")
    priority = django_filters.CharFilter(field_name="priority")
    start_date = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    end_date = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    unassigned = django_filters.BooleanFilter(method="filter_unassigned")
    sla = django_filters.CharFilter(method="filter_sla")

    class Meta:
        model = SupportCase
        fields = ["account", "status", "kind", "priority", "start_date", "end_date"]

    def filter_unassigned(self, queryset, name, value):
        if value is True:
            return queryset.filter(assigned_to__isnull=True)
        if value is False:
            return queryset.filter(assigned_to__isnull=False)
        return queryset

    def filter_sla(self, queryset, name, value):
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        active = queryset.filter(
            status__in=[SupportCase.Status.OPEN, SupportCase.Status.PENDING]
        )
        if value == "breached":
            return active.filter(sla_due_at__isnull=False, sla_due_at__lt=now)
        if value == "at_risk":
            return active.filter(
                sla_due_at__isnull=False,
                sla_due_at__gt=now,
                sla_due_at__lte=now + timedelta(hours=2),
            )
        return queryset
