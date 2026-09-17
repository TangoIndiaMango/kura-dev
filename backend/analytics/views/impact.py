"""Government impact stats + ImpactStory CMS."""
from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import HasCapability
from analytics.models import ImpactStory
from analytics.serializers.impact import (
    ImpactStoryDetailSerializer,
    ImpactStoryListSerializer,
    ImpactStoryWriteSerializer,
)
from analytics.services.impact import account_impact, monthly_snapshot
from analytics.services.stories import ImpactStoryService
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.selectors import _own_account_ids


class ImpactStatsView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:impact"

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="period",
                type=str,
                location=OpenApiParameter.QUERY,
                description="YYYY-MM",
            )
        ],
        responses={200: dict},
    )
    def get(self, request):
        period = request.query_params.get("period") or None
        return ok(monthly_snapshot(period=period))


class MeImpactView(APIView):
    """GET /accounts/me/impact/ — owner savings estimate."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request):
        from accounts.models import Account
        from analytics.services.impact import DISCLAIMER

        own = _own_account_ids(request.user)
        if not own:
            return ok(
                {
                    "swaps_completed": 0,
                    "saved_vs_petrol_kobo": 0,
                    "saved_since": None,
                    "swaps_per_week": "0.0",
                    "co2_kg_est": "0",
                    "disclaimer": DISCLAIMER,
                }
            )
        account = Account.objects.get(pk=own[0])
        return ok(account_impact(account=account))


class ImpactStoryViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    search_fields = ["title", "region", "partners"]
    ordering_fields = ["created_at", "published_at", "status"]
    capability_map = {
        "list": "analytics:impact",
        "retrieve": "analytics:impact",
        "create": "impact:manage",
        "partial_update": "impact:manage",
        "publish": "impact:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ImpactStory.objects.none()
        qs = ImpactStory.objects.select_related("created_by").order_by("-created_at")
        status = (self.request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ImpactStoryListSerializer
        if self.action in ("create", "partial_update"):
            return ImpactStoryWriteSerializer
        return ImpactStoryDetailSerializer

    def create(self, request, *args, **kwargs):
        ser = ImpactStoryWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        story = ImpactStoryService.create(data=ser.validated_data, actor=request.user)
        return created(ImpactStoryDetailSerializer(story).data)

    def partial_update(self, request, *args, **kwargs):
        ser = ImpactStoryWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        story = ImpactStoryService.update(
            story=self.get_object(), data=ser.validated_data, actor=request.user
        )
        return ok(ImpactStoryDetailSerializer(story).data)

    @extend_schema(responses={200: ImpactStoryDetailSerializer})
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        story = ImpactStoryService.publish(
            story=self.get_object(), actor=request.user
        )
        return ok(ImpactStoryDetailSerializer(story).data)
