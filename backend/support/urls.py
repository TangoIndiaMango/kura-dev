from rest_framework.routers import DefaultRouter

from support.views import SupportCaseViewSet

router = DefaultRouter()
router.register(r"cases", SupportCaseViewSet, basename="support-cases")

urlpatterns = router.urls
