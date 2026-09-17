"""Public segments mount — /api/v1/segments/."""
from rest_framework.routers import DefaultRouter

from credit.views.segments import SegmentViewSet

router = DefaultRouter()
router.register(r"", SegmentViewSet, basename="segments-root")

urlpatterns = router.urls
