from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability, user_has_capability
from core.pagination import KuraCursorPagination
from finance.models import LedgerTransaction
from finance.serializers import LedgerTransactionSerializer


class LedgerTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = LedgerTransactionSerializer
    pagination_class = KuraCursorPagination
    required_capability = "finance:read"
    capability_map = {
        "list": "finance:read",
        "retrieve": "finance:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return LedgerTransaction.objects.none()
        if not user_has_capability(self.request.user, "finance:read"):
            return LedgerTransaction.objects.none()
        return (
            LedgerTransaction.objects.prefetch_related("entries__ledger_account")
            .all()
            .order_by("-posted_at", "-id")
        )
