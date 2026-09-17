from mobility.views.batteries import BatteryViewSet
from mobility.views.battery_types import BatteryTypeViewSet
from mobility.views.discounts import DiscountViewSet
from mobility.views.eboarders import EBoarderViewSet
from mobility.views.engines import PetrolEngineViewSet
from mobility.views.hubs import HubViewSet
from mobility.views.pricing import HoldPolicyView, PriceMatrixViewSet
from mobility.views.plans import PlanViewSet
from mobility.views.reservations_plans import ReservationViewSet
from mobility.views.retrofits import RetrofitViewSet
from mobility.views.subscriptions import SubscriptionViewSet
from mobility.views.swaps import SwapViewSet
from mobility.views.vehicle_models import VehicleModelViewSet
from mobility.views.vehicles import VehicleViewSet

__all__ = [
    "BatteryTypeViewSet",
    "BatteryViewSet",
    "DiscountViewSet",
    "EBoarderViewSet",
    "HoldPolicyView",
    "HubViewSet",
    "PetrolEngineViewSet",
    "PlanViewSet",
    "PriceMatrixViewSet",
    "ReservationViewSet",
    "RetrofitViewSet",
    "SubscriptionViewSet",
    "SwapViewSet",
    "VehicleModelViewSet",
    "VehicleViewSet",
]
