"""Admin hubs ViewSet — list/detail/slots/status/stats/export."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasCapability
from core.helpers.csv_export import table_export_response
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.helpers import hub_export_rows
from mobility.models import Hub, HubSlot
from mobility.selectors import hub_detail_stats, hub_stats, hubs_with_slot_counts
from mobility.serializers import (
    HubDetailSerializer,
    HubListSerializer,
    HubSlotListSerializer,
    HubStatusSerializer,
    HubWriteSerializer,
)
from mobility.services.hubs.service import HubService

HUB_EXPORT_HEADERS = [
    "id",
    "code",
    "name",
    "address",
    "status",
    "slot_count",
    "ready_count",
    "charging_count",
    "empty_count",
    "fault_count",
    "solar_capacity_kw",
    "created_at",
]


class HubViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    filterset_fields = ["status"]
    search_fields = ["code", "name", "address"]
    ordering_fields = ["code", "name", "created_at"]
    capability_map = {
        "list": "hubs:read",
        "retrieve": "hubs:read",
        "stats": "hubs:read",
        "detail_stats": "hubs:read",
        "export": "hubs:read",
        "slots": "hubs:read",
        "create": "hubs:manage",
        "partial_update": "hubs:manage",
        "status": "hubs:manage",
        "discover": None,
    }

    def get_permissions(self):
        if getattr(self, "action", None) == "discover":
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Hub.objects.none()
        return hubs_with_slot_counts(self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return HubListSerializer
        if self.action in ("create", "partial_update"):
            return HubWriteSerializer
        if self.action == "status":
            return HubStatusSerializer
        if self.action == "slots":
            return HubSlotListSerializer
        return HubDetailSerializer

    def create(self, request, *args, **kwargs):
        ser = HubWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        code = (data.get("code") or "").strip()
        if not code:
            return Response(
                {"detail": "Hub code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        hub = HubService.create_hub(
            code=code,
            name=data["name"],
            address=data["address"],
            lat=data.get("lat", 6.5173),
            lng=data.get("lng", 3.3734),
            slot_count=data.get("slot_count", 16),
            solar_capacity_kw=data.get("solar_capacity_kw", "12.50"),
            status=data.get("status", Hub.Status.ONLINE),
            actor=request.user,
        )
        return created(HubDetailSerializer(hubs_with_slot_counts().get(pk=hub.pk)).data)

    def partial_update(self, request, *args, **kwargs):
        hub = self.get_object()
        ser = HubWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        updated = HubService.update_hub(
            hub, actor=request.user, **ser.validated_data
        )
        return ok(
            HubDetailSerializer(hubs_with_slot_counts().get(pk=updated.pk)).data
        )

    @extend_schema(responses={200: HubSlotListSerializer(many=True)})
    @action(detail=True, methods=["get"])
    def slots(self, request, pk=None):
        hub = self.get_object()
        qs = (
            HubSlot.objects.filter(hub=hub)
            .select_related("battery")
            .order_by("slot_no")
        )
        return ok(HubSlotListSerializer(qs, many=True).data)

    @extend_schema(request=HubStatusSerializer, responses={200: HubDetailSerializer})
    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        ser = HubStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        hub = HubService.set_status(
            hub=self.get_object(),
            status=ser.validated_data["status"],
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return ok(HubDetailSerializer(hubs_with_slot_counts().get(pk=hub.pk)).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(hub_stats(request.user))

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"], url_path="stats")
    def detail_stats(self, request, pk=None):
        return ok(
            hub_detail_stats(
                self.get_object(),
                start_date=request.query_params.get("start_date"),
                end_date=request.query_params.get("end_date"),
            )
        )

    @extend_schema(responses={200: list})
    @action(detail=False, methods=["get"], url_path="discover")
    def discover(self, request):
        """PRD: vehicle/battery_type + lat/lng/radius/open_now → ready + distance_km."""
        from mobility.services.hubs.discover import discover_hubs

        params = request.query_params
        lat = params.get("lat")
        lng = params.get("lng")
        radius = params.get("radius_km")
        open_now = str(params.get("open_now") or "").lower() in {
            "1",
            "true",
            "yes",
        }
        rows = discover_hubs(
            vehicle_id=params.get("vehicle") or params.get("vehicle_id"),
            battery_type_id=params.get("battery_type")
            or params.get("battery_type_id"),
            lat=float(lat) if lat not in (None, "") else None,
            lng=float(lng) if lng not in (None, "") else None,
            radius_km=float(radius) if radius not in (None, "") else None,
            open_now=open_now,
        )
        return Response(rows)

    @extend_schema(responses={200: bytes})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="hubs",
            title="Kura hubs",
            headers=HUB_EXPORT_HEADERS,
            rows=hub_export_rows(qs),
        )
