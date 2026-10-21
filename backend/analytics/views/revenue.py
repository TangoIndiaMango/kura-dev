from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from analytics.selectors import revenue_overview, revenue_streams
from core.exceptions import DomainError
from core.responses import ok


def _date_param(value: str | None, name: str):
    if not value:
        return None
    parsed = parse_date(value)
    if parsed is None:
        raise DomainError(
            "VALIDATION_ERROR",
            f"{name} must be YYYY-MM-DD.",
            details={name: ["invalid_date"]},
        )
    return parsed


class RevenueAnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:revenue"

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE),
            OpenApiParameter("end_date", OpenApiTypes.DATE),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        return ok(
            revenue_overview(
                start_date=_date_param(
                    request.query_params.get("start_date"),
                    "start_date",
                ),
                end_date=_date_param(
                    request.query_params.get("end_date"),
                    "end_date",
                ),
            )
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE),
            OpenApiParameter("end_date", OpenApiTypes.DATE),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="streams")
    def streams(self, request):
        return ok(
            revenue_streams(
                start_date=_date_param(
                    request.query_params.get("start_date"),
                    "start_date",
                ),
                end_date=_date_param(
                    request.query_params.get("end_date"),
                    "end_date",
                ),
            )
        )
