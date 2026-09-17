from django.urls import path
from rest_framework.routers import DefaultRouter

from analytics.views import (
    DashboardStatsView,
    DemandForecastViewSet,
    RevenueAnalyticsViewSet,
)
from analytics.views.impact import ImpactStatsView, ImpactStoryViewSet
from analytics.views_cooperative import CooperativeAnalyticsView, MyCooperativeView

router = DefaultRouter()
router.register(r"stories", ImpactStoryViewSet, basename="impact-stories")
router.register(r"revenue", RevenueAnalyticsViewSet, basename="revenue-analytics")
router.register(r"demand", DemandForecastViewSet, basename="demand-forecast")

urlpatterns = [
    path("dashboard/", DashboardStatsView.as_view(), name="dashboard_stats"),
    path("impact/", ImpactStatsView.as_view(), name="analytics-impact"),
    path(
        "cooperative/me/",
        MyCooperativeView.as_view(),
        name="analytics-cooperative-me",
    ),
    path(
        "cooperative/<uuid:cooperative_id>/",
        CooperativeAnalyticsView.as_view(),
        name="analytics-cooperative",
    ),
    *router.urls,
]
