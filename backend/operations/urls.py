from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, OverrideViewSet, AlertViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shifts')
router.register(r'overrides', OverrideViewSet, basename='overrides')
router.register(r'alerts', AlertViewSet, basename='alerts')

urlpatterns = router.urls
