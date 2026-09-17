"""Telemetry fleet + event APIs."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import HasCapability
from core.pagination import KuraCursorPagination
from core.responses import created, ok
from mobility.models import TelemetryEvent
from mobility.services.telemetry import TelemetryService, fleet_telemetry_rows


class TelemetryEventSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(source="vehicle.id", read_only=True)
    vehicle_reg = serializers.CharField(
        source="vehicle.registration_plate", read_only=True
    )

    class Meta:
        model = TelemetryEvent
        fields = [
            "id",
            "vehicle_id",
            "vehicle_reg",
            "recorded_at",
            "battery_pct",
            "lat",
            "lng",
            "speed_kmh",
            "odometer_km",
            "source",
            "ingest_batch",
            "raw",
            "created_at",
        ]


class TelemetryIngestSerializer(serializers.Serializer):
    vehicle_id = serializers.UUIDField()
    recorded_at = serializers.DateTimeField(required=False)
    battery_pct = serializers.IntegerField(required=False, min_value=0, max_value=100)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    speed_kmh = serializers.FloatField(required=False, allow_null=True)
    odometer_km = serializers.FloatField(required=False, allow_null=True)
    source = serializers.ChoiceField(
        choices=TelemetryEvent.Source.choices, required=False
    )
    battery_id = serializers.UUIDField(required=False, allow_null=True)
    ingest_batch = serializers.CharField(required=False, allow_blank=True, max_length=64)
    raw = serializers.DictField(required=False)


class TelemetryFleetView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "telemetry:read"

    @extend_schema(responses={200: dict})
    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        rows = fleet_telemetry_rows(search=search)
        live = sum(1 for r in rows if r["telemetry_status"] == "LIVE")
        stationary = sum(1 for r in rows if r["telemetry_status"] == "STATIONARY")
        offline = sum(1 for r in rows if r["telemetry_status"] == "OFFLINE")
        return ok(
            {
                "totals": {
                    "vehicles": len(rows),
                    "live": live,
                    "stationary": stationary,
                    "offline": offline,
                },
                "results": rows,
            }
        )


class TelemetryEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraCursorPagination
    serializer_class = TelemetryEventSerializer
    capability_map = {
        "list": "telemetry:read",
        "retrieve": "telemetry:read",
        "ingest": "telemetry:ingest",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TelemetryEvent.objects.none()
        qs = TelemetryEvent.objects.select_related("vehicle").order_by("-recorded_at")
        vehicle_id = self.request.query_params.get("vehicle_id")
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    @extend_schema(
        request=TelemetryIngestSerializer, responses={201: TelemetryEventSerializer}
    )
    @action(detail=False, methods=["post"])
    def ingest(self, request):
        ser = TelemetryIngestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        evt = TelemetryService.ingest(data=ser.validated_data, actor=request.user)
        evt = TelemetryEvent.objects.select_related("vehicle").get(pk=evt.pk)
        return created(TelemetryEventSerializer(evt).data)
