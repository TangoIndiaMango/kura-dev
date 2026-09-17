from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasCapability
from accounts.selectors.scope import hub_ids_for
from core.helpers.csv_export import table_export_response
from core.pagination import KuraCursorPagination
from core.responses import ok
from operations.filters import AlertFilter
from operations.helpers import alert_export_rows
from operations.models import Alert
from operations.selectors import alert_stats
from operations.serializers import (
    AlertDetailSerializer,
    AlertListSerializer,
    AlertNoteSerializer,
)
from operations.services import AlertService

ALERT_EXPORT_HEADERS = [
    "id",
    "kind",
    "severity",
    "status",
    "message",
    "hub_code",
    "hub_name",
    "delivery_channel",
    "resolve_note",
    "created_at",
    "acknowledged_at",
    "resolved_at",
]


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraCursorPagination
    filterset_class = AlertFilter
    search_fields = ["message", "kind", "hub__code", "hub__name"]
    capability_map = {
        "list": "alerts:read",
        "retrieve": "alerts:read",
        "stats": "alerts:read",
        "export": "alerts:read",
        "ack": "alerts:manage",
        "resolve": "alerts:manage",
        "escalate": "alerts:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Alert.objects.none()
        qs = Alert.objects.select_related(
            "hub", "acknowledged_by", "resolved_by"
        )
        scope = hub_ids_for(self.request.user)
        if scope is None:
            return qs
        if not scope:
            return qs.none()
        return qs.filter(hub_id__in=scope)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AlertDetailSerializer
        return AlertListSerializer

    def _reload(self, alert_id):
        return self.get_queryset().get(pk=alert_id)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(
            alert_stats(
                start_date=request.query_params.get("start_date"),
                end_date=request.query_params.get("end_date"),
                user=request.user,
            )
        )

    @extend_schema(responses={200: bytes})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="alerts",
            title="Kura alerts",
            headers=ALERT_EXPORT_HEADERS,
            rows=alert_export_rows(qs),
        )

    @extend_schema(request=AlertNoteSerializer, responses={200: AlertDetailSerializer})
    @action(detail=True, methods=["post"])
    def ack(self, request, pk=None):
        ser = AlertNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        alert = AlertService.ack(alert=self.get_object(), actor=request.user)
        return Response(AlertDetailSerializer(self._reload(alert.pk)).data)

    @extend_schema(request=AlertNoteSerializer, responses={200: AlertDetailSerializer})
    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        ser = AlertNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        alert = AlertService.resolve(
            alert=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return Response(AlertDetailSerializer(self._reload(alert.pk)).data)

    @extend_schema(request=AlertNoteSerializer, responses={200: AlertDetailSerializer})
    @action(detail=True, methods=["post"])
    def escalate(self, request, pk=None):
        ser = AlertNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        alert = AlertService.escalate(
            alert=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return Response(AlertDetailSerializer(self._reload(alert.pk)).data)
