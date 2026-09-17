"""Account CRM FilterSets."""
from __future__ import annotations

import django_filters
from django.db.models import Q

from accounts.models import Account


class AccountFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_search")
    search = django_filters.CharFilter(method="filter_search")
    status = django_filters.CharFilter(field_name="status")
    kyc_status = django_filters.CharFilter(field_name="kyc_status")
    kind = django_filters.CharFilter(field_name="kind")
    created_after = django_filters.IsoDateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_before = django_filters.IsoDateTimeFilter(
        field_name="created_at", lookup_expr="lte"
    )
    start_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="gte"
    )
    end_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="lte"
    )

    class Meta:
        model = Account
        fields = ["status", "kyc_status", "kind"]

    def filter_search(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(kura_id__icontains=value)
            | Q(display_name__icontains=value)
            | Q(owner_user__phone__icontains=value)
            | Q(owner_user__email__icontains=value)
            | Q(vehicles__registration_plate__icontains=value)
            | Q(vehicles__hardware_id__icontains=value)
        ).distinct()
