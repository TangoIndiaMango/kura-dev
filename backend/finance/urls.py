from rest_framework.routers import DefaultRouter

from finance.views import LedgerTransactionViewSet, PaymentViewSet, WalletViewSet

router = DefaultRouter()
router.register(r"wallets", WalletViewSet, basename="wallets")
router.register(r"payments", PaymentViewSet, basename="payments")
router.register(r"ledger", LedgerTransactionViewSet, basename="ledger")

urlpatterns = router.urls
