from __future__ import annotations

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Account, Driver
from accounts.permissions import HasCapability, user_has_capability
from core.exceptions import DomainError
from core.helpers.csv_export import table_export_response
from core.pagination import KuraCursorPagination
from core.responses import ok
from support.filters import SupportCaseFilter
from support.helpers import case_export_rows
from support.models import SupportCase
from support.selectors import _own_account_ids, case_stats, cases_for
from support.serializers import (
    CaseAssignSerializer,
    CaseNoteSerializer,
    CaseStatusSerializer,
    OpenCaseSerializer,
    SupportCaseDetailSerializer,
    SupportCaseListSerializer,
)
from support.services import SupportCaseService

User = get_user_model()

CASE_EXPORT_HEADERS = [
    "id",
    "code",
    "subject",
    "kind",
    "account_kura_id",
    "operator",
    "assignee",
    "priority",
    "status",
    "sla_due_at",
    "created_at",
]


class SupportCaseViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraCursorPagination
    filterset_class = SupportCaseFilter
    search_fields = ["code", "subject", "account__display_name", "account__kura_id"]
    capability_map = {
        "list": ["cases:read", "cases:write_own"],
        "retrieve": ["cases:read", "cases:write_own"],
        "stats": "cases:read",
        "export": "cases:read",
        "create": ["cases:manage", "cases:write_own"],
        "add_note": ["cases:manage", "cases:write_own"],
        "set_status": "cases:manage",
        "assign": "cases:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return SupportCase.objects.none()
        return cases_for(self.request.user)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SupportCaseDetailSerializer
        return SupportCaseListSerializer

    def _reload(self, case_id):
        return cases_for(self.request.user).get(pk=case_id)

    def _resolve_account(self, data: dict) -> Account:
        account_id = data.get("account_id")
        own = _own_account_ids(self.request.user)
        staff = user_has_capability(self.request.user, "cases:manage")
        if account_id is None:
            if len(own) == 1:
                return get_object_or_404(Account, pk=own[0])
            raise DomainError(
                "VALIDATION_ERROR",
                "account_id is required.",
                http=400,
            )
        account = get_object_or_404(Account, pk=account_id)
        if not staff and account.id not in own:
            raise DomainError(
                "FORBIDDEN",
                "You can only open cases on your own account.",
                http=403,
            )
        return account

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(
            case_stats(
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
            filename_stem="support-cases",
            title="Kura support cases",
            headers=CASE_EXPORT_HEADERS,
            rows=case_export_rows(qs),
        )

    @extend_schema(request=OpenCaseSerializer, responses={201: SupportCaseDetailSerializer})
    def create(self, request, *args, **kwargs):
        ser = OpenCaseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account = self._resolve_account(data)
        driver = None
        if data.get("driver_id"):
            driver = get_object_or_404(Driver, pk=data["driver_id"], account=account)
        case = SupportCaseService.open_case(
            account=account,
            subject=data["subject"],
            kind=data["kind"],
            priority=data["priority"],
            driver=driver,
            opened_by=request.user,
            body=data.get("body") or "",
            attachment_asset_id=data.get("attachment_asset_id"),
            payment_id=data.get("payment_id"),
        )
        if data.get("assigned_to_id") and user_has_capability(
            request.user, "cases:manage"
        ):
            assignee = get_object_or_404(User, pk=data["assigned_to_id"])
            case = SupportCaseService.assign(
                case=case, assignee=assignee, actor=request.user
            )
        return Response(
            SupportCaseDetailSerializer(self._reload(case.pk)).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=CaseNoteSerializer, responses={201: SupportCaseDetailSerializer})
    @action(detail=True, methods=["post"], url_path="notes")
    def add_note(self, request, pk=None):
        ser = CaseNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        case = self.get_object()
        SupportCaseService.add_note(
            case=case,
            actor=request.user,
            body=ser.validated_data.get("body") or "",
            attachment_asset_id=ser.validated_data.get("attachment_asset_id"),
        )
        return Response(
            SupportCaseDetailSerializer(self._reload(case.pk)).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=CaseStatusSerializer, responses={200: SupportCaseDetailSerializer})
    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        ser = CaseStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        case = SupportCaseService.set_status(
            case=self.get_object(),
            status=ser.validated_data["status"],
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return Response(SupportCaseDetailSerializer(self._reload(case.pk)).data)

    @extend_schema(request=CaseAssignSerializer, responses={200: SupportCaseDetailSerializer})
    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        ser = CaseAssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        assignee_id = ser.validated_data.get("assigned_to_id")
        assignee = get_object_or_404(User, pk=assignee_id) if assignee_id else None
        case = SupportCaseService.assign(
            case=self.get_object(), assignee=assignee, actor=request.user
        )
        return Response(SupportCaseDetailSerializer(self._reload(case.pk)).data)
