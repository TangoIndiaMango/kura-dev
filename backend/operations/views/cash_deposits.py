"""Cash deposit catalogue ViewSet + receipt PDF / amount-mismatch flag."""
from __future__ import annotations

from django.http import HttpResponse
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.models import Account
from accounts.permissions import HasCapability, user_has_capability
from accounts.selectors.scope import hub_ids_for
from core.exceptions import DomainError
from core.pagination import KuraCursorPagination
from core.responses import created, ok
from finance.selectors import _can_read_all_finance
from finance.services.receipts import (
    build_cash_receipt_document,
    render_receipt_pdf,
    verify_receipt_seal,
)
from mobility.models import Hub
from operations.models import CashDeposit, Shift
from operations.serializers_cash import (
    CashDepositCreateSerializer,
    CashDepositDetailSerializer,
    CashDepositListSerializer,
)
from operations.services.cash.deposits import CashDepositService
from support.models import SupportCase
from support.services import SupportCaseService


class CashDepositFlagSerializer(serializers.Serializer):
    note = serializers.CharField(min_length=8, max_length=2000)
    claimed_amount_kobo = serializers.IntegerField(min_value=0, required=False)


class CashDepositViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraCursorPagination
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["status", "hub", "shift", "agent"]
    search_fields = ["receipt_code", "account__kura_id"]
    ordering_fields = ["created_at"]
    capability_map = {
        "list": "finance:read",
        "retrieve": "finance:read",
        "create": "shifts:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CashDeposit.objects.none()
        qs = (
            CashDeposit.objects.select_related(
                "agent", "hub", "account", "account__owner_user", "shift", "payment"
            )
            .all()
            .order_by("-created_at")
        )
        user = self.request.user
        # finance:read alone also sits on rider roles; only staff readers see
        # every deposit (same rule as payments_for).
        if _can_read_all_finance(user) or user_has_capability(user, "shifts:manage"):
            return qs
        return qs.filter(account__owner_user=user)

    def get_serializer_class(self):
        if self.action == "list":
            return CashDepositListSerializer
        if self.action == "create":
            return CashDepositCreateSerializer
        if self.action == "flag":
            return CashDepositFlagSerializer
        return CashDepositDetailSerializer

    def get_permissions(self):
        if self.action in ("receipt", "flag"):
            return [IsAuthenticated()]
        if self.action == "create":
            return [IsAuthenticated(), HasCapability()]
        return super().get_permissions()
    def _assert_can_access(self, request, deposit: CashDeposit) -> None:
        if _can_read_all_finance(request.user):
            return
        if user_has_capability(request.user, "shifts:manage"):
            return
        if deposit.account.owner_user_id == request.user.id:
            return
        raise DomainError("FORBIDDEN", "Not allowed to access this receipt.", http=403)

    @extend_schema(
        request=CashDepositCreateSerializer, responses={201: CashDepositDetailSerializer}
    )
    def create(self, request, *args, **kwargs):
        ser = CashDepositCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        hub = Hub.objects.filter(pk=data["hub_id"]).first()
        account = Account.objects.filter(pk=data["account_id"]).first()
        if hub is None or account is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Unknown hub or account.",
                details={
                    "hub_id": ["invalid"] if hub is None else [],
                    "account_id": ["invalid"] if account is None else [],
                },
            )
        hub_scope = hub_ids_for(request.user)
        if hub_scope is not None and hub.id not in hub_scope:
            raise DomainError("NOT_FOUND", "Hub not found.", http=404)
        shift = None
        if data.get("shift_id"):
            shift = Shift.objects.filter(pk=data["shift_id"]).first()
            if shift is None:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "Unknown shift.",
                    details={"shift_id": ["invalid"]},
                )
        deposit = CashDepositService.record(
            agent=request.user,
            hub=hub,
            account=account,
            amount_kobo=data["amount_kobo"],
            shift=shift,
            psp_agent_ref=data.get("psp_agent_ref", ""),
            purpose=data.get("purpose", "SWAP"),
            idempotency_key=data.get("idempotency_key", ""),
            actor=request.user,
        )
        row = self.get_queryset().get(pk=deposit.pk)
        return created(CashDepositDetailSerializer(row).data)

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        deposit = self.get_object()
        self._assert_can_access(request, deposit)
        doc = build_cash_receipt_document(deposit=deposit)
        if not verify_receipt_seal(doc):
            raise DomainError("INTEGRATION_ERROR", "Receipt seal failed.", http=500)
        out_fmt = (request.query_params.get("as") or request.query_params.get("download") or "json").lower()
        if out_fmt == "pdf":
            pdf = render_receipt_pdf(doc)
            resp = HttpResponse(pdf, content_type="application/pdf")
            resp["Content-Disposition"] = (
                f'attachment; filename="{deposit.receipt_code}.pdf"'
            )
            return resp
        return ok(doc)

    @extend_schema(request=CashDepositFlagSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def flag(self, request, pk=None):
        """Operator reports cash handed ≠ receipt amount (opens PAYMENT_DISPUTE)."""
        deposit = self.get_object()
        self._assert_can_access(request, deposit)
        ser = CashDepositFlagSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        claimed = data.get("claimed_amount_kobo")
        body = data["note"].strip()
        if claimed is not None:
            body = (
                f"Claimed cash handed: {claimed} kobo "
                f"(receipt {deposit.amount_kobo} kobo).\n\n{body}"
            )
        case = SupportCaseService.open_case(
            account=deposit.account,
            subject=f"Cash amount mismatch · {deposit.receipt_code}",
            kind=SupportCase.Kind.PAYMENT_DISPUTE,
            priority=SupportCase.Priority.HIGH,
            opened_by=request.user,
            body=body,
        )
        return ok(
            {
                "case_id": str(case.id),
                "case_code": case.code,
                "receipt_code": deposit.receipt_code,
                "receipt_amount_kobo": deposit.amount_kobo,
                "claimed_amount_kobo": claimed,
            }
        )
