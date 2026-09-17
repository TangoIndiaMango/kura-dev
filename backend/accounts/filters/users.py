"""Staff user directory filters."""
from __future__ import annotations

import django_filters
from django.db.models import Q

from accounts.models import User


class StaffUserFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_search")
    search = django_filters.CharFilter(method="filter_search")
    role = django_filters.CharFilter(field_name="role")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    status = django_filters.CharFilter(method="filter_status")
    start_date = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = User
        fields = ["role", "is_active"]

    def filter_search(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(email__icontains=value)
            | Q(first_name__icontains=value)
            | Q(last_name__icontains=value)
            | Q(phone__icontains=value)
            | Q(public_id__icontains=value)
        )

    def filter_status(self, queryset, name, value):
        value = (value or "").strip().upper()
        if value == "ACTIVE":
            return queryset.filter(is_active=True, last_login__isnull=False)
        if value == "INVITED":
            return queryset.filter(is_active=True, last_login__isnull=True)
        if value in {"SUSPENDED", "REVOKED"}:
            return queryset.filter(is_active=False)
        return queryset
