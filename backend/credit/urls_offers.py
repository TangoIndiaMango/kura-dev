"""Public offers mount — /api/v1/offers/ (alias of credit offer routes)."""
from rest_framework.routers import DefaultRouter

from credit.views import OfferAssignmentViewSet, ProductOfferViewSet

router = DefaultRouter()
router.register(r"", ProductOfferViewSet, basename="offers-root")
router.register(
    r"assignments", OfferAssignmentViewSet, basename="offer-assignments-root"
)

urlpatterns = router.urls
