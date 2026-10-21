"""Vehicle detail actions — assign, QR, IoT, soft VCU commands."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response

from core.responses import ok
from mobility.serializers.catalogue import VehicleSerializer
from mobility.serializers.vehicles import (
    VehicleAssignDriverSerializer,
    VehicleAssignmentHistorySerializer,
    VehicleCommandSerializer,
    VehicleDetailSerializer,
)
from mobility.services.vehicles.assignment import VehicleAssignmentService
from mobility.services.vehicles.qr import (
    resolve_vehicle_qr,
    rotate_vehicle_qr,
    vehicle_qr_payload,
)
from rest_framework import serializers


class VehicleQrResolveSerializer(serializers.Serializer):
    token = serializers.CharField()


class VehicleActionMixin:
    """Mixin onto VehicleViewSet — keeps vehicles.py under the line ceiling."""

    @extend_schema(
        request=VehicleAssignDriverSerializer,
        responses={200: VehicleDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="assign-driver")
    def assign_driver(self, request, pk=None):
        ser = VehicleAssignDriverSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vehicle = VehicleAssignmentService.assign(
            vehicle=self.get_object(),
            driver_id=ser.validated_data.get("driver_id"),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        row = self.get_queryset().get(pk=vehicle.pk)
        return ok(VehicleDetailSerializer(row).data)

    @extend_schema(responses={200: VehicleAssignmentHistorySerializer(many=True)})
    @action(detail=True, methods=["get"])
    def assignments(self, request, pk=None):
        vehicle = self.get_object()
        rows = (
            vehicle.assignments.select_related("driver__user")
            .order_by("-starts_at", "-id")[:50]
        )
        payload = [
            {
                "id": row.id,
                "driver_id": row.driver_id,
                "driver_name": (
                    f"{row.driver.user.first_name} {row.driver.user.last_name}".strip()
                    or row.driver.user.phone
                    or str(row.driver_id)[:8]
                ),
                "driver_phone": row.driver.user.phone,
                "starts_at": row.starts_at,
                "ends_at": row.ends_at,
                "note": row.note,
            }
            for row in rows
        ]
        return ok(VehicleAssignmentHistorySerializer(payload, many=True).data)

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

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"])
    def commands(self, request, pk=None):
        vehicle = self.get_object()
        rows = vehicle.commands.order_by("-created_at")[:40]
        return ok(
            [
                {
                    "id": str(r.id),
                    "kind": r.kind,
                    "status": r.status,
                    "note": r.note,
                    "error": r.error,
                    "created_at": r.created_at,
                    "acked_at": r.acked_at,
                }
                for r in rows
            ]
        )

    @extend_schema(request=VehicleCommandSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def command(self, request, pk=None):
        from mobility.services.vehicles.commands import VehicleCommandService

        ser = VehicleCommandSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = VehicleCommandService.enqueue(
            vehicle=self.get_object(),
            kind=ser.validated_data["kind"],
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return ok(
            {
                "id": str(row.id),
                "kind": row.kind,
                "status": row.status,
                "note": row.note,
            }
        )

    @extend_schema(request=VehicleQrResolveSerializer, responses={200: VehicleSerializer})
    @action(detail=False, methods=["post"])
    def resolve(self, request):
        ser = VehicleQrResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vehicle = resolve_vehicle_qr(token=ser.validated_data["token"])
        return Response(VehicleSerializer(vehicle).data)
