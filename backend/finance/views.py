from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from core.money import naira_to_kobo
from accounts.models import Account
from .models import Wallet, VirtualAccount, LedgerTransaction, Payment
from .serializers import (
    WalletSerializer, VirtualAccountSerializer, LedgerTransactionSerializer,
    PaymentSerializer, FundWalletRequestSerializer
)
from .services import WalletService

class WalletViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletSerializer
    queryset = Wallet.objects.select_related('account').all()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Wallet.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Wallet.objects.none()
        qs = Wallet.objects.select_related('account').all()
        if hasattr(user, 'role') and user.role == 'DRIVER' and hasattr(user, 'driver_profile'):
            return qs.filter(account=user.driver_profile.account)
        return qs.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def mine(self, request):
        user = request.user
        driver = getattr(user, 'driver_profile', None)
        account = driver.account if driver else user.accounts.first()
        if not account:
            account = Account.objects.create(owner_user=user, display_name=user.phone or user.email)

        wallet = WalletService.get_or_create_wallet(account)
        va = VirtualAccount.objects.filter(account=account).first()

        return Response({
            "wallet": WalletSerializer(wallet).data,
            "virtual_account": VirtualAccountSerializer(va).data if va else None
        })

    @extend_schema(request=FundWalletRequestSerializer)
    @action(detail=False, methods=['post'])
    def fund(self, request):
        serializer = FundWalletRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        driver = getattr(user, 'driver_profile', None)
        account = driver.account if driver else user.accounts.first()

        amount_kobo = naira_to_kobo(serializer.validated_data['amount_naira'])
        channel = serializer.validated_data['channel']

        payment = WalletService.fund_wallet(account=account, amount_kobo=amount_kobo, channel=channel)
        wallet = Wallet.objects.get(account=account)

        return Response({
            "status": "success",
            "payment": PaymentSerializer(payment).data,
            "new_balance_naira": wallet.balance_kobo / 100.0
        }, status=status.HTTP_201_CREATED)

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related('account').all()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Payment.objects.none()
        qs = Payment.objects.select_related('account').all()
        if hasattr(user, 'role') and user.role == 'DRIVER' and hasattr(user, 'driver_profile'):
            return qs.filter(account=user.driver_profile.account)
        return qs.order_by('-created_at')

class LedgerTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LedgerTransactionSerializer
    queryset = LedgerTransaction.objects.prefetch_related('entries__ledger_account').all().order_by('-posted_at')
