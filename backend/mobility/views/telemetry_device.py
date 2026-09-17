"""Device-key POST /telemetry/ingest (no JWT)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from core.responses import created
from mobility.services.telemetry_iot import TelemetryIotService
from mobility.views.telemetry import TelemetryEventSerializer


class TelemetryDeviceEventSerializer(serializers.Serializer):
    recorded_at = serializers.DateTimeField(required=False)
    battery_pct = serializers.IntegerField(required=False, min_value=0, max_value=100)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    speed_kmh = serializers.FloatField(required=False, allow_null=True)
    odometer_km = serializers.FloatField(required=False, allow_null=True)
    battery_id = serializers.UUIDField(required=False, allow_null=True)
    raw = serializers.DictField(required=False)


class TelemetryDeviceIngestSerializer(serializers.Serializer):
    hardware_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    ingest_batch = serializers.CharField(required=False, allow_blank=True, max_length=64)
    events = TelemetryDeviceEventSerializer(many=True, required=False)
    recorded_at = serializers.DateTimeField(required=False)
    battery_pct = serializers.IntegerField(required=False, min_value=0, max_value=100)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    speed_kmh = serializers.FloatField(required=False, allow_null=True)
    odometer_km = serializers.FloatField(required=False, allow_null=True)
    battery_id = serializers.UUIDField(required=False, allow_null=True)
    raw = serializers.DictField(required=False)


class TelemetryDeviceIngestView(APIView):
    """PRD: POST /telemetry/ingest — per-device API key (hashed at rest)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=TelemetryDeviceIngestSerializer,
        responses={201: TelemetryEventSerializer(many=True)},
    )
    def post(self, request):
        ser = TelemetryDeviceIngestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        device_key = (
            request.headers.get("X-Kura-Device-Key")
            or request.META.get("HTTP_X_KURA_DEVICE_KEY")
            or ""
        )
        events = TelemetryIotService.ingest_batch(
            device_key=device_key,
            payload=ser.validated_data,
        )
        return created(TelemetryEventSerializer(events, many=True).data)
