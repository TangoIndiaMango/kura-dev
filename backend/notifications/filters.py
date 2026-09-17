from __future__ import annotations

import django_filters

from notifications.models import Notification


class NotificationFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_search")
    search = django_filters.CharFilter(method="filter_search")
    source = django_filters.CharFilter(field_name="source")
    severity = django_filters.CharFilter(field_name="severity")
    unread = django_filters.BooleanFilter(method="filter_unread")
    start_date = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Notification
        fields = ["source", "severity", "channel"]

    def filter_search(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        from django.db.models import Q

        return queryset.filter(Q(title__icontains=value) | Q(body__icontains=value))

    def filter_unread(self, queryset, name, value):
        if value is True:
            return queryset.filter(read_at__isnull=True)
        if value is False:
            return queryset.filter(read_at__isnull=False)
        return queryset
