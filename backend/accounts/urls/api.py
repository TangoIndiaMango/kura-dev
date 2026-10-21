from django.urls import path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    AccountViewSet,
    DriverViewSet,
    PermissionViewSet,
    RoleViewSet,
    StaffUserViewSet,
)
from accounts.views.cooperatives import CooperativeViewSet
from analytics.views.impact import MeFleetSpendView, MeImpactView

router = DefaultRouter()
router.register(r"accounts", AccountViewSet, basename="accounts")
router.register(r"drivers", DriverViewSet, basename="drivers")
router.register(r"users", StaffUserViewSet, basename="users")
router.register(r"roles", RoleViewSet, basename="roles")
router.register(r"permissions", PermissionViewSet, basename="permissions")
router.register(r"cooperatives", CooperativeViewSet, basename="cooperatives")

urlpatterns = [
    path("accounts/me/impact/", MeImpactView.as_view(), name="accounts-me-impact"),
    path(
        "accounts/me/fleet-spend/",
        MeFleetSpendView.as_view(),
        name="accounts-me-fleet-spend",
    ),
    *router.urls,
]
