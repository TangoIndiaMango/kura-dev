from django.urls import path
from rest_framework.routers import DefaultRouter

from operations.views import (
    AlertRuleViewSet,
    AlertViewSet,
    CashDepositViewSet,
    InventoryCountViewSet,
    OverrideViewSet,
    ShiftViewSet,
)
from operations.views.command_centre import CommandCentreView, OpsActivityView

router = DefaultRouter()
router.register(r"shifts", ShiftViewSet, basename="shifts")
router.register(r"cash-deposits", CashDepositViewSet, basename="cash-deposits")
router.register(r"overrides", OverrideViewSet, basename="overrides")
router.register(r"alerts", AlertViewSet, basename="alerts")
router.register(r"alert-rules", AlertRuleViewSet, basename="alert-rules")
router.register(
    r"inventory-counts", InventoryCountViewSet, basename="inventory-counts"
)

urlpatterns = [
    path(
        "command-centre/",
        CommandCentreView.as_view(),
        name="ops-command-centre",
    ),
    path("activity/", OpsActivityView.as_view(), name="ops-activity"),
    *router.urls,
]
