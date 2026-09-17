from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapabilityOrReadOwn
from core.exceptions import DomainError
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from finance.filters import WalletFilter
from finance.models import Wallet
from finance.selectors import wallets_for
from finance.serializers import (
    FundWalletRequestSerializer,
    PaymentSerializer,
    WalletDetailSerializer,
    WalletListSerializer,
)
from finance.services import WalletService


class WalletViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    pagination_class = KuraPageNumberPagination
    filterset_class = WalletFilter
    http_method_names = ["get", "post", "head", "options"]
    capability_map = {
        "list": "finance:read",
        "retrieve": "finance:read",
        "mine": "finance:read",
        "fund": "finance:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Wallet.objects.none()
        return wallets_for(self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return WalletListSerializer
        return WalletDetailSerializer

    def _own_account(self, user):
        driver = getattr(user, "driver_profile", None)
        account = driver.account if driver else user.accounts.order_by("created_at").first()
        if account is None:
            raise DomainError(
                "ACCOUNT_REQUIRED",
                "Complete profile before accessing wallet.",
                http=400,
            )
        return account

    @extend_schema(responses={200: WalletDetailSerializer})
    @action(detail=False, methods=["get"])
    def mine(self, request):
        account = self._own_account(request.user)
        wallet = WalletService.get_or_create_wallet(account)
        wallet = (
            Wallet.objects.select_related("account")
            .prefetch_related("account__virtual_account")
            .get(pk=wallet.pk)
        )
        return ok(WalletDetailSerializer(wallet).data)

    @extend_schema(request=FundWalletRequestSerializer, responses={201: dict})
    @action(detail=False, methods=["post"])
    def fund(self, request):
        """DEBUG-only sandbox credit via integrations mock (no real USSD/PSP)."""
        from integrations.services.mock_credit import apply_dev_wallet_credit

        ser = FundWalletRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = self._own_account(request.user)
        payment = apply_dev_wallet_credit(
            account=account,
            amount_kobo=ser.validated_data["amount_kobo"],
            actor=request.user,
            source="ussd_mock",
        )
        wallet = Wallet.objects.get(account=account)
        return created(
            {
                "payment": PaymentSerializer(payment).data,
                "wallet": WalletListSerializer(wallet).data,
            }
        )
