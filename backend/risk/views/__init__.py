from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Account
from accounts.permissions import HasCapability
from core.helpers.csv_export import table_export_response
from core.pagination import KuraCursorPagination, KuraPageNumberPagination
from core.responses import ok
from risk.filters import RiskEventFilter
from risk.helpers import risk_event_export_rows
from risk.models import RiskEvent, RiskRule
from risk.selectors import risk_event_stats
from risk.serializers import (
    FlagRiskEventSerializer,
    RiskEventDetailSerializer,
    RiskEventListSerializer,
    RiskReviewSerializer,
    RiskRuleSerializer,
)
from risk.services import RiskService

EVENT_EXPORT_HEADERS = [
    "id",
    "rule_code",
    "rule_name",
    "account_kura_id",
    "operator",
    "subject_type",
    "subject_id",
    "severity",
    "score",
    "action_taken",
    "status",
    "reviewed_by",
    "review_note",
    "created_at",
]


class RiskRuleViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = RiskRuleSerializer
    pagination_class = KuraPageNumberPagination
    capability_map = {"list": "risk:read", "retrieve": "risk:read"}

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return RiskRule.objects.none()
        RiskService.ensure_rules()
        return RiskRule.objects.all()


class RiskEventViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraCursorPagination
    filterset_class = RiskEventFilter
    search_fields = [
        "rule__code",
        "rule__name",
        "account__display_name",
        "account__kura_id",
        "subject_id",
    ]
    capability_map = {
        "list": "risk:read",
        "retrieve": "risk:read",
        "stats": "risk:read",
        "export": "risk:read",
        "create": "risk:review",
        "review": "risk:review",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return RiskEvent.objects.none()
        RiskService.ensure_rules()
        return RiskEvent.objects.select_related("rule", "account", "reviewed_by")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RiskEventDetailSerializer
        return RiskEventListSerializer

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(
            risk_event_stats(
                start_date=request.query_params.get("start_date"),
                end_date=request.query_params.get("end_date"),
            )
        )

    @extend_schema(responses={200: bytes})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="risk-events",
            title="Kura risk events",
            headers=EVENT_EXPORT_HEADERS,
            rows=risk_event_export_rows(qs),
        )

    @extend_schema(request=FlagRiskEventSerializer, responses={201: RiskEventDetailSerializer})
    def create(self, request, *args, **kwargs):
        ser = FlagRiskEventSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account = get_object_or_404(Account, pk=data["account_id"])
        note = (data.get("note") or "").strip()
        event = RiskService.emit(
            rule_code=data.get("rule_code") or "MANUAL_FLAG",
            subject_type="account",
            subject_id=str(account.id),
            account=account,
            severity=data.get("severity"),
            context={"note": note, "flagged_by": str(request.user.id)} if note else {
                "flagged_by": str(request.user.id)
            },
        )
        return Response(
            RiskEventDetailSerializer(event).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=RiskReviewSerializer, responses={200: RiskEventDetailSerializer})
    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        ser = RiskReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        event = RiskService.review(
            event=self.get_object(),
            status=ser.validated_data["status"],
            reviewer=request.user,
            note=ser.validated_data.get("note") or "",
            allow_swap=ser.validated_data.get("allow_swap"),
            ttl_hours=ser.validated_data.get("ttl_hours"),
            max_uses=ser.validated_data.get("max_uses"),
        )
        return Response(RiskEventDetailSerializer(event).data)
