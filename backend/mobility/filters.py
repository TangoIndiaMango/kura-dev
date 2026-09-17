from __future__ import annotations

import django_filters
from django.db.models import Q

from mobility.models import Reservation, Subscription, Swap, Vehicle


class AccountScopedFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")


class VehicleFilter(AccountScopedFilter):
    status = django_filters.CharFilter(field_name="status")

    class Meta:
        model = Vehicle
        fields = ["account", "status"]


class SubscriptionFilter(AccountScopedFilter):
    status = django_filters.CharFilter(field_name="status")
    vehicle = django_filters.UUIDFilter(field_name="vehicle_id")
    plan = django_filters.UUIDFilter(field_name="plan_id")

    class Meta:
        model = Subscription
        fields = ["account", "status", "vehicle", "plan"]


class ReservationFilter(AccountScopedFilter):
    status = django_filters.CharFilter(method="filter_status")
    payment_mode = django_filters.CharFilter(field_name="payment_mode")
    hub = django_filters.UUIDFilter(field_name="hub_id")
    vehicle = django_filters.UUIDFilter(field_name="vehicle_id")
    start_date = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    end_date = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Reservation
        fields = ["account", "status", "payment_mode", "hub", "vehicle", "code", "start_date", "end_date"]

    def filter_status(self, queryset, name, value):
        from django.utils import timezone

        if not value:
            return queryset
        raw = str(value).upper()
        now = timezone.now()
        live = [
            Reservation.Status.PENDING,
            Reservation.Status.CONFIRMED,
        ]
        if raw == "ACTIVE":
            return queryset.filter(status__in=live, expires_at__gt=now)
        if raw == "EXPIRED":
            return queryset.filter(
                Q(status=Reservation.Status.EXPIRED)
                | Q(status__in=live, expires_at__lte=now)
            )
        return queryset.filter(status=raw)


class SwapFilter(AccountScopedFilter):
    status = django_filters.CharFilter(field_name="status")
    payment_mode = django_filters.CharFilter(field_name="payment_mode")
    hub = django_filters.UUIDFilter(field_name="hub_id")
    vehicle = django_filters.UUIDFilter(field_name="vehicle_id")
    agent = django_filters.UUIDFilter(field_name="agent_id")
    battery = django_filters.UUIDFilter(method="filter_battery")
    start_date = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    end_date = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Swap
        fields = [
            "account",
            "status",
            "payment_mode",
            "hub",
            "vehicle",
            "agent",
            "battery",
            "start_date",
            "end_date",
        ]

    def filter_battery(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(returned_battery_id=value) | Q(issued_battery_id=value)
        )
