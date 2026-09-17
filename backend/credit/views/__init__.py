from credit.views.credit import (
    CreditApplicationViewSet,
    CreditEligibilityView,
    CreditScoreViewSet,
    LoanViewSet,
)
from credit.views.offers import OfferAssignmentViewSet, ProductOfferViewSet
from credit.views.segments import SegmentViewSet

__all__ = [
    "CreditEligibilityView",
    "CreditApplicationViewSet",
    "LoanViewSet",
    "CreditScoreViewSet",
    "ProductOfferViewSet",
    "OfferAssignmentViewSet",
    "SegmentViewSet",
]
