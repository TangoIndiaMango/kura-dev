from django.urls import path
from rest_framework.routers import DefaultRouter

from credit.views import (
    CreditApplicationViewSet,
    CreditEligibilityView,
    CreditScoreViewSet,
    LoanViewSet,
    OfferAssignmentViewSet,
    ProductOfferViewSet,
)

router = DefaultRouter()
router.register(r"applications", CreditApplicationViewSet, basename="credit-applications")
router.register(r"loans", LoanViewSet, basename="credit-loans")
router.register(r"scores", CreditScoreViewSet, basename="credit-scores")
router.register(r"offers", ProductOfferViewSet, basename="product-offers")
router.register(
    r"offer-assignments", OfferAssignmentViewSet, basename="offer-assignments"
)

urlpatterns = [
    path("eligibility/", CreditEligibilityView.as_view(), name="credit-eligibility"),
    *router.urls,
]
