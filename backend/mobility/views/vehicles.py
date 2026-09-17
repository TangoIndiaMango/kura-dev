"""Admin + operator vehicle ViewSet (list/detail/stats/export/QR/status)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasCapabilityOrReadOwn, user_has_capability
from core.exceptions import DomainError
from core.helpers.csv_export import table_export_response
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.filters import VehicleFilter
from mobility.helpers.export import vehicle_export_rows
from mobility.models import Vehicle, VehicleModel
from mobility.selectors import _own_account_ids, vehicle_stats, vehicles_for
from mobility.serializers.catalogue import VehicleSerializer
from mobility.serializers.vehicles import (
    VehicleDetailSerializer,
    VehicleListSerializer,
    VehicleModelListSerializer,
    VehicleNoteSerializer,
    VehicleStatusSerializer,
    VehicleWriteSerializer,
)
from mobility.services.vehicles.qr import (
    resolve_vehicle_qr,
    rotate_vehicle_qr,
    vehicle_qr_payload,
)
from mobility.services.vehicles.service import VehicleService
from rest_framework import serializers


class VehicleQrResolveSerializer(serializers.Serializer):
    token = serializers.CharField()


VEHICLE_EXPORT_HEADERS = [
    "id",
    "registration_plate",
    "make",
    "model",
    "vehicle_type",
    "owner_kura_id",
    "status",
    "created_at",
]


class VehicleViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    pagination_class = KuraPageNumberPagination
    filterset_class = VehicleFilter
    search_fields = [
        "registration_plate",
        "hardware_id",
        "vin",
        "account__display_name",
        "account__kura_id",
        "vehicle_model__make",
        "vehicle_model__model",
    ]
    ordering_fields = ["registration_plate", "created_at", "status"]
    capability_map = {
        "list": "vehicles:read",
        "retrieve": "vehicles:read",
        "stats": "vehicles:read",
        "export": "vehicles:read",
        "models": "vehicles:read",
        "create": "vehicles:manage",
        "partial_update": "vehicles:manage",
        "status": "vehicles:manage",
        "retire": "vehicles:manage",
        "qr": "swaps:read",
        "rotate_qr": "swaps:override",
        "resolve": "swaps:complete",
        "rotate_iot_key": "telemetry:ingest",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Vehicle.objects.none()
        return vehicles_for(self.request.user).select_related(
            "account",
            "vehicle_model",
            "vehicle_model__battery_type",
            "current_battery",
            "current_battery__battery_type",
            "petrol_engine",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return VehicleListSerializer
        if self.action in ("create", "partial_update"):
            return VehicleWriteSerializer
        if self.action == "status":
            return VehicleStatusSerializer
        if self.action == "models":
            return VehicleModelListSerializer
        return VehicleDetailSerializer

    def create(self, request, *args, **kwargs):
        payload = dict(request.data)
        own = _own_account_ids(request.user)
        staff = user_has_capability(request.user, "accounts:read") or user_has_capability(
            request.user, "vehicles:read"
        )
        if not payload.get("account_id"):
            if len(own) == 1:
                payload["account_id"] = str(own[0])
        ser = VehicleWriteSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account_id = data["account_id"]
        if not staff and account_id not in own:
            raise DomainError(
                "FORBIDDEN",
                "You can only register vehicles on your own account.",
                http=403,
            )
        vehicle = VehicleService.create(data=data, actor=request.user)
        row = self.get_queryset().get(pk=vehicle.pk)
        return created(VehicleDetailSerializer(row).data)

    def partial_update(self, request, *args, **kwargs):
        ser = VehicleWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        vehicle = VehicleService.update(
            vehicle=self.get_object(), data=ser.validated_data, actor=request.user
        )
        row = self.get_queryset().get(pk=vehicle.pk)
        return ok(VehicleDetailSerializer(row).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        if not user_has_capability(request.user, "vehicles:read"):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return ok(vehicle_stats())

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        if not user_has_capability(request.user, "vehicles:read"):
            return Response(status=status.HTTP_403_FORBIDDEN)
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="vehicles",
            title="Kura vehicles",
            headers=VEHICLE_EXPORT_HEADERS,
            rows=vehicle_export_rows(qs),
        )

    @extend_schema(responses={200: VehicleModelListSerializer(many=True)})
    @action(detail=False, methods=["get"])
    def models(self, request):
        if not (
            user_has_capability(request.user, "vehicles:read")
            or user_has_capability(request.user, "swaps:read")
        ):
            return Response(status=status.HTTP_403_FORBIDDEN)
        qs = VehicleModel.objects.select_related("battery_type").order_by(
            "make", "model"
        )
        return Response(VehicleModelListSerializer(qs, many=True).data)

    @extend_schema(request=VehicleStatusSerializer, responses={200: VehicleDetailSerializer})
    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        ser = VehicleStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vehicle = VehicleService.set_status(
            vehicle=self.get_object(),
            status=ser.validated_data["status"],
            actor=request.user,
        )
        row = self.get_queryset().get(pk=vehicle.pk)
        return ok(VehicleDetailSerializer(row).data)

    @extend_schema(request=VehicleNoteSerializer, responses={200: VehicleDetailSerializer})
    @action(detail=True, methods=["post"])
    def retire(self, request, pk=None):
        ser = VehicleNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vehicle = VehicleService.retire(
            vehicle=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        row = self.get_queryset().get(pk=vehicle.pk)
        return ok(VehicleDetailSerializer(row).data)

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"])
    def qr(self, request, pk=None):
        return Response(vehicle_qr_payload(vehicle=self.get_object()))

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["post"], url_path="rotate-qr")
    def rotate_qr(self, request, pk=None):
        return Response(
            rotate_vehicle_qr(vehicle=self.get_object(), actor=request.user)
        )

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["post"], url_path="rotate-iot-key")
    def rotate_iot_key(self, request, pk=None):
        from mobility.services.telemetry_iot import TelemetryIotService

        vehicle = self.get_object()
        plain = TelemetryIotService.rotate_api_key(
            vehicle=vehicle, actor=request.user
        )
        return ok(
            {
                "vehicle_id": str(vehicle.id),
                "hardware_id": vehicle.hardware_id or "",
                "api_key": plain,
                "hint": "Store once — plaintext is not recoverable.",
            }
        )

    @extend_schema(request=VehicleQrResolveSerializer, responses={200: VehicleSerializer})
    @action(detail=False, methods=["post"])
    def resolve(self, request):
        ser = VehicleQrResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vehicle = resolve_vehicle_qr(token=ser.validated_data["token"])
        return Response(VehicleSerializer(vehicle).data)
