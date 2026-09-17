from rest_framework.routers import DefaultRouter
from django.urls import path

from mobility.views import (
    BatteryTypeViewSet,
    BatteryViewSet,
    DiscountViewSet,
    HoldPolicyView,
    HubViewSet,
    PetrolEngineViewSet,
    PlanViewSet,
    PriceMatrixViewSet,
    ReservationViewSet,
    RetrofitViewSet,
    EBoarderViewSet,
    SubscriptionViewSet,
    SwapViewSet,
    VehicleModelViewSet,
    VehicleViewSet,
)
from mobility.views.telemetry import TelemetryEventViewSet, TelemetryFleetView

router = DefaultRouter()
router.register(r"hubs", HubViewSet, basename="hubs")
router.register(r"batteries", BatteryViewSet, basename="batteries")
router.register(r"battery-types", BatteryTypeViewSet, basename="battery-types")
router.register(r"vehicles", VehicleViewSet, basename="vehicles")
router.register(r"vehicle-models", VehicleModelViewSet, basename="vehicle-models")
router.register(r"plans", PlanViewSet, basename="plans")
router.register(r"subscriptions", SubscriptionViewSet, basename="subscriptions")
router.register(r"discounts", DiscountViewSet, basename="discounts")
router.register(r"reservations", ReservationViewSet, basename="reservations")
router.register(r"swaps", SwapViewSet, basename="swaps")
router.register(r"pricing/matrices", PriceMatrixViewSet, basename="price-matrices")
router.register(r"engines", PetrolEngineViewSet, basename="engines")
router.register(r"eboarders", EBoarderViewSet, basename="eboarders")
router.register(r"retrofits", RetrofitViewSet, basename="retrofits")
router.register(r"telemetry/events", TelemetryEventViewSet, basename="telemetry-events")

urlpatterns = [
    path(
        "pricing/hold-policy/",
        HoldPolicyView.as_view(),
        name="bay-hold-policy",
    ),
    path(
        "telemetry/fleet/",
        TelemetryFleetView.as_view(),
        name="telemetry-fleet",
    ),
    *router.urls,
]
