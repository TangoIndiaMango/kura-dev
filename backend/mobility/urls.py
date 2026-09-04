from rest_framework.routers import DefaultRouter
from .views import (
    HubViewSet, BatteryViewSet, VehicleViewSet,
    PlanViewSet, SubscriptionViewSet, ReservationViewSet, SwapViewSet
)

router = DefaultRouter()
router.register(r'hubs', HubViewSet, basename='hubs')
router.register(r'batteries', BatteryViewSet, basename='batteries')
router.register(r'vehicles', VehicleViewSet, basename='vehicles')
router.register(r'plans', PlanViewSet, basename='plans')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscriptions')
router.register(r'reservations', ReservationViewSet, basename='reservations')
router.register(r'swaps', SwapViewSet, basename='swaps')

urlpatterns = router.urls
