from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from analytics.selectors import hub_demand_forecast
from core.exceptions import DomainError
from core.responses import ok


class DemandForecastViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "hubs:read"

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "lookback_days",
                OpenApiTypes.INT,
                description="Historical window, clamped to 7–90 days.",
            )
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="hubs")
    def hubs(self, request):
        raw_days = request.query_params.get("lookback_days", "28")
        try:
            days = int(raw_days)
        except ValueError as error:
            raise DomainError(
                "VALIDATION_ERROR",
                "lookback_days must be an integer.",
            ) from error
        return ok(
            {
                "results": hub_demand_forecast(
                    user=request.user,
                    lookback_days=days,
                )
            }
        )
