from rest_framework.routers import DefaultRouter

from risk.views import RiskEventViewSet, RiskRuleViewSet

router = DefaultRouter()
router.register(r"rules", RiskRuleViewSet, basename="risk-rules")
router.register(r"events", RiskEventViewSet, basename="risk-events")

urlpatterns = router.urls
