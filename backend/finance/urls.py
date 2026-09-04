from rest_framework.routers import DefaultRouter
from .views import WalletViewSet, PaymentViewSet, LedgerTransactionViewSet

router = DefaultRouter()
router.register(r'wallets', WalletViewSet, basename='wallets')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'ledger', LedgerTransactionViewSet, basename='ledger')

urlpatterns = router.urls
