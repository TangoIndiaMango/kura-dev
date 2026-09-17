from __future__ import annotations

import django_filters

from audit.models import AuditEvent


class AuditEventFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_search")
    search = django_filters.CharFilter(method="filter_search")
    action = django_filters.CharFilter(field_name="action", lookup_expr="icontains")
    subject_type = django_filters.CharFilter(field_name="subject_type")
    subject_id = django_filters.CharFilter(method="filter_subject_ids")
    actor = django_filters.CharFilter(method="filter_actor")
    start_date = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditEvent
        fields = ["action", "subject_type", "subject_id"]

    def filter_subject_ids(self, queryset, name, value):
        """One id or comma-separated ids (account + owner user on operator detail)."""
        ids = [part.strip() for part in (value or "").split(",") if part.strip()]
        if not ids:
            return queryset
        if len(ids) == 1:
            return queryset.filter(subject_id=ids[0])
        return queryset.filter(subject_id__in=ids)

    def filter_search(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        from django.db.models import Q

        return queryset.filter(
            Q(action__icontains=value)
            | Q(actor_email__icontains=value)
            | Q(subject_label__icontains=value)
            | Q(subject_id__icontains=value)
            | Q(subject_type__icontains=value)
        )

    def filter_actor(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(actor_email__icontains=value)
