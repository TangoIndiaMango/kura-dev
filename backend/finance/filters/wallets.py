from __future__ import annotations

import django_filters

from finance.models import Wallet


class WalletFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account_id")
    status = django_filters.CharFilter(field_name="status")

    class Meta:
        model = Wallet
        fields = ["account", "status"]
