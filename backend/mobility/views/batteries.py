"""Admin batteries ViewSet — CRUD + custody verbs + events feed."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasCapability
from core.helpers.csv_export import table_export_response
from core.pagination import KuraCursorPagination, KuraPageNumberPagination
from core.responses import created, ok
from mobility.helpers import battery_export_rows
from mobility.models import Battery, BatteryType
from mobility.models import BatteryEvent
from mobility.selectors import batteries_queryset, battery_stats
from mobility.serializers import BatteryTypeSerializer
from mobility.serializers.batteries import (
    BatteryDetailSerializer,
    BatteryEventSerializer,
    BatteryListSerializer,
    BatteryNoteSerializer,
    BatteryStatusSerializer,
    BatteryTransferSerializer,
    BatteryWriteSerializer,
)
from mobility.services.batteries.service import BatteryService
from mobility.services.batteries.qr import (
    battery_label_payload,
    resolve_battery_qr,
    rotate_battery_qr,
)


class BatteryResolveSerializer(serializers.Serializer):
    token = serializers.CharField()


BATTERY_EXPORT_HEADERS = [
    "id",
    "serial",
    "battery_type",
    "status",
    "charge_pct",
    "health_pct",
    "cycle_count",
    "hub_code",
    "hub_name",
    "created_at",
]


class BatteryEventCursorPagination(KuraCursorPagination):
    ordering = ("-occurred_at", "-id")


class BatteryViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    filterset_fields = ["status", "battery_type", "current_hub"]
    search_fields = [
        "serial",
        "battery_type__name",
        "current_hub__code",
        "current_hub__name",
    ]
    ordering_fields = ["created_at", "serial", "status", "charge_pct", "health_pct"]
    capability_map = {
        "list": "batteries:read",
        "retrieve": "batteries:read",
        "stats": "batteries:read",
        "export": "batteries:read",
        "types": "batteries:read",
        "events": "batteries:read",
        "label": "batteries:manage",
        "rotate_qr": "batteries:manage",
        "resolve": "batteries:read",
        "create": "batteries:manage",
        "partial_update": "batteries:manage",
        "status": "batteries:manage",
        "transfer": "batteries:manage",
        "fault": "batteries:manage",
        "found": "batteries:manage",
        "retire": "batteries:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Battery.objects.none()
        return batteries_queryset(self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return BatteryListSerializer
        if self.action in ("create", "partial_update"):
            return BatteryWriteSerializer
        if self.action == "status":
            return BatteryStatusSerializer
        if self.action == "transfer":
            return BatteryTransferSerializer
        if self.action in ("fault", "found", "retire"):
            return BatteryNoteSerializer
        if self.action == "types":
            return BatteryTypeSerializer
        if self.action == "events":
            return BatteryEventSerializer
        return BatteryDetailSerializer

    def _reload(self, pk):
        return batteries_queryset(self.request.user).get(pk=pk)

    def create(self, request, *args, **kwargs):
        ser = BatteryWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        serial = (data.get("serial") or "").strip()
        type_id = data.get("battery_type_id")
        if not serial or not type_id:
            return Response(
                {"detail": "serial and battery_type_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        battery = BatteryService.create(
            data={
                "serial": serial,
                "battery_type_id": type_id,
                "current_hub_id": data.get("current_hub_id"),
                "status": data.get("status", Battery.Status.AVAILABLE),
                "charge_pct": data.get("charge_pct", 100),
                "health_pct": data.get("health_pct", 100),
                "cycle_count": data.get("cycle_count", 0),
            },
            actor=request.user,
        )
        return created(BatteryDetailSerializer(self._reload(battery.pk)).data)

    def partial_update(self, request, *args, **kwargs):
        battery = self.get_object()
        ser = BatteryWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        updated = BatteryService.update(
            battery=battery, data=ser.validated_data, actor=request.user
        )
        return ok(BatteryDetailSerializer(self._reload(updated.pk)).data)

    @extend_schema(request=BatteryStatusSerializer, responses={200: BatteryDetailSerializer})
    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        ser = BatteryStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        hub_provided = "current_hub_id" in request.data
        battery = BatteryService.set_status(
            battery=self.get_object(),
            status=data["status"],
            current_hub_id=data.get("current_hub_id"),
            hub_provided=hub_provided,
            actor=request.user,
            note=data.get("note") or "",
        )
        return ok(BatteryDetailSerializer(self._reload(battery.pk)).data)

    @extend_schema(
        request=BatteryTransferSerializer, responses={200: BatteryDetailSerializer}
    )
    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        ser = BatteryTransferSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        battery = BatteryService.transfer(
            battery=self.get_object(),
            destination=data["destination"],
            hub_id=data.get("hub_id"),
            actor=request.user,
            note=data.get("note") or "",
        )
        return ok(BatteryDetailSerializer(self._reload(battery.pk)).data)

    @extend_schema(request=BatteryNoteSerializer, responses={200: BatteryDetailSerializer})
    @action(detail=True, methods=["post"])
    def fault(self, request, pk=None):
        ser = BatteryNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        battery = BatteryService.fault(
            battery=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return ok(BatteryDetailSerializer(self._reload(battery.pk)).data)

    @extend_schema(request=BatteryNoteSerializer, responses={200: BatteryDetailSerializer})
    @action(detail=True, methods=["post"])
    def found(self, request, pk=None):
        ser = BatteryNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        battery = BatteryService.found(
            battery=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return ok(BatteryDetailSerializer(self._reload(battery.pk)).data)

    @extend_schema(request=BatteryNoteSerializer, responses={200: BatteryDetailSerializer})
    @action(detail=True, methods=["post"])
    def retire(self, request, pk=None):
        ser = BatteryNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        battery = BatteryService.retire(
            battery=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return ok(BatteryDetailSerializer(self._reload(battery.pk)).data)

    @extend_schema(responses={200: BatteryEventSerializer(many=True)})
    @action(
        detail=True,
        methods=["get"],
        pagination_class=BatteryEventCursorPagination,
    )
    def events(self, request, pk=None):
        battery = self.get_object()
        qs = (
            BatteryEvent.objects.filter(battery=battery)
            .select_related("hub", "actor")
            .order_by("-occurred_at", "-id")
        )
        page = self.paginate_queryset(qs)
        ser = BatteryEventSerializer(page, many=True)
        return self.get_paginated_response(ser.data)

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"])
    def label(self, request, pk=None):
        return ok(battery_label_payload(battery=self.get_object()))

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["post"], url_path="rotate-qr")
    def rotate_qr(self, request, pk=None):
        return ok(rotate_battery_qr(battery=self.get_object(), actor=request.user))

    @extend_schema(
        request=BatteryResolveSerializer, responses={200: BatteryDetailSerializer}
    )
    @action(detail=False, methods=["post"])
    def resolve(self, request):
        ser = BatteryResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        battery = resolve_battery_qr(token=ser.validated_data["token"])
        return ok(BatteryDetailSerializer(self._reload(battery.pk)).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(battery_stats(request.user))

    @extend_schema(responses={200: BatteryTypeSerializer(many=True)})
    @action(detail=False, methods=["get"])
    def types(self, request):
        qs = BatteryType.objects.order_by("name")
        return ok(BatteryTypeSerializer(qs, many=True).data)

    @extend_schema(responses={200: bytes})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="batteries",
            title="Kura batteries",
            headers=BATTERY_EXPORT_HEADERS,
            rows=battery_export_rows(qs),
        )
