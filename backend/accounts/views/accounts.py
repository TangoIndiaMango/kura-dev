"""Account ViewSet — thin; writes via AccountService / IdentityService."""
from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.filters import AccountFilter
from accounts.helpers import is_crm_staff
from accounts.helpers.export import account_export_rows
from accounts.models import Account, Cooperative, Driver, IdentityDocument
from accounts.permissions import HasCapabilityOrReadOwn
from accounts.selectors import account_detail_stats, account_stats, accounts_for
from accounts.serializers import (
    AccountCooperativeSerializer,
    AccountCrmDetailSerializer,
    AccountCrmListSerializer,
    AccountProfileSerializer,
    AccountSerializer,
    AccountSuspendSerializer,
    OperatorRegisterSerializer,
)
from accounts.services import AccountService
from accounts.services.cooperatives import CooperativeService
from accounts.views.account_identity import AccountIdentityActionsMixin
from core.helpers.csv_export import table_export_response
from core.exceptions import DomainError
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok


class AccountViewSet(AccountIdentityActionsMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = AccountSerializer
    pagination_class = KuraPageNumberPagination
    filterset_class = AccountFilter
    search_fields = [
        "kura_id",
        "display_name",
        "owner_user__phone",
        "owner_user__email",
        "vehicles__registration_plate",
        "vehicles__hardware_id",
    ]
    ordering_fields = ["created_at", "display_name"]
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "accounts:read",
        "retrieve": "accounts:read",
        "partial_update": ["accounts:manage", "accounts:write_own"],
        "create": "accounts:write_own",
        "kyc": "accounts:read",
        "stats": "accounts:read",
        "detail_stats": "accounts:read",
        "export": "accounts:read",
        "identity": "accounts:write_own",
        "identity_withdraw": "accounts:write_own",
        "identity_photos": "accounts:write_own",
        "verify_kyc": "accounts:manage",
        "reject_kyc": "accounts:manage",
        "request_kyc_photos": "accounts:manage",
        "submit_kyc": "accounts:manage",
        "notify_rider": "accounts:manage",
        "suspend": "accounts:manage",
        "reinstate": "accounts:manage",
        "set_cooperative": "accounts:manage",
        "register_operator": "accounts:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Account.objects.none()
        qs = accounts_for(self.request.user).select_related(
            "owner_user", "cooperative"
        )
        qs = qs.prefetch_related(
            Prefetch(
                "identity_documents",
                queryset=IdentityDocument.objects.select_related(
                    "front_image", "back_image"
                ).order_by("-created_at"),
            ),
            Prefetch(
                "drivers",
                queryset=Driver.objects.select_related("photo").order_by("created_at"),
            ),
        )
        if getattr(self, "action", None) in {
            "list",
            "retrieve",
            "suspend",
            "reinstate",
            "detail_stats",
            "kyc",
            "verify_kyc",
            "reject_kyc",
            "request_kyc_photos",
            "notify_rider",
            "export",
        }:
            from mobility.models import Subscription, Vehicle

            qs = qs.select_related("wallet").prefetch_related(
                Prefetch(
                    "vehicles",
                    queryset=Vehicle.objects.order_by("created_at"),
                ),
                Prefetch(
                    "subscriptions",
                    queryset=Subscription.objects.select_related("plan").order_by(
                        "-created_at"
                    ),
                ),
            )
        return qs

    def filter_queryset(self, queryset):
        if self.action == "detail_stats":
            return queryset
        return super().filter_queryset(queryset)

    def get_serializer_class(self):
        if is_crm_staff(self.request.user) and self.action == "list":
            return AccountCrmListSerializer
        if is_crm_staff(self.request.user) and self.action in {
            "retrieve",
            "partial_update",
            "suspend",
            "reinstate",
            "set_cooperative",
            "notify_rider",
        }:
            return AccountCrmDetailSerializer
        return AccountSerializer

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        return ok(
            account_stats(
                start_date=request.query_params.get("start_date"),
                end_date=request.query_params.get("end_date"),
            )
        )

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"], url_path="stats")
    def detail_stats(self, request, pk=None):
        return ok(
            account_detail_stats(
                self.get_object(),
                start_date=request.query_params.get("start_date"),
                end_date=request.query_params.get("end_date"),
            )
        )

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="operators",
            title="Kura operators",
            headers=[
                "id",
                "kura_id",
                "name",
                "phone",
                "email",
                "status",
                "kyc_status",
                "kind",
                "registration_channel",
                "created_at",
            ],
            rows=account_export_rows(qs),
        )

    @extend_schema(request=AccountProfileSerializer, responses={201: AccountSerializer})
    def create(self, request, *args, **kwargs):
        ser = AccountProfileSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = AccountService.complete_profile(
            user=request.user,
            **ser.validated_data,
        )
        return created(AccountSerializer(account).data)

    @extend_schema(
        request=OperatorRegisterSerializer, responses={201: AccountCrmDetailSerializer}
    )
    @action(detail=False, methods=["post"], url_path="register")
    def register_operator(self, request):
        from accounts.services.registration import register_operator

        ser = OperatorRegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account, meta = register_operator(
            actor=request.user,
            full_name=data["full_name"],
            phone=data["phone"],
            email=data["email"],
            id_type=data.get("id_type") or "",
            id_number=data.get("id_number") or "",
            cooperative_id=(
                str(data["cooperative_id"]) if data.get("cooperative_id") else None
            ),
        )
        payload = AccountCrmDetailSerializer(account).data
        payload["invite_email_sent"] = meta["invite_email_sent"]
        payload["invite_expires_hours"] = meta["expires_hours"]
        return created(payload)

    def partial_update(self, request, *args, **kwargs):
        account = self.get_object()
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            raise DomainError(
                "VALIDATION_ERROR",
                "display_name is required.",
                details={"display_name": ["required"]},
            )

        is_owner = account.owner_user_id == request.user.id
        if not is_owner:
            raise DomainError(
                "PERMISSION_DENIED",
                "Operators update their own full name on Identity. Staff cannot rename them.",
                http=403,
            )

        account = AccountService.complete_profile(
            user=request.user,
            display_name=display_name,
            first_name=request.data.get("first_name", ""),
            last_name=request.data.get("last_name", ""),
        )
        if is_crm_staff(request.user):
            return ok(AccountCrmDetailSerializer(account).data)
        return ok(AccountSerializer(account).data)

    @extend_schema(request=AccountSuspendSerializer, responses={200: AccountCrmDetailSerializer})
    @action(detail=True, methods=["post"], url_path="suspend")
    def suspend(self, request, pk=None):
        ser = AccountSuspendSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = AccountService.suspend(
            account=self.get_object(),
            actor=request.user,
            reason=ser.validated_data["reason"],
        )
        return ok(AccountCrmDetailSerializer(account).data)

    @extend_schema(responses={200: AccountCrmDetailSerializer})
    @action(detail=True, methods=["post"], url_path="reinstate")
    def reinstate(self, request, pk=None):
        account = AccountService.reinstate(
            account=self.get_object(),
            actor=request.user,
        )
        return ok(AccountCrmDetailSerializer(account).data)

    @extend_schema(
        request=AccountCooperativeSerializer,
        responses={200: AccountCrmDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="set-cooperative")
    def set_cooperative(self, request, pk=None):
        ser = AccountCooperativeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        coop_id = ser.validated_data.get("cooperative_id")
        coop = None
        if coop_id is not None:
            coop = Cooperative.objects.filter(pk=coop_id).first()
            if coop is None:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "Unknown cooperative.",
                    details={"cooperative_id": ["invalid"]},
                )
        account = CooperativeService.assign_account(
            account=self.get_object(),
            cooperative=coop,
            actor=request.user,
        )
        account = (
            self.get_queryset()
            .select_related("owner_user", "cooperative", "wallet")
            .prefetch_related("vehicles")
            .get(pk=account.pk)
        )
        return ok(AccountCrmDetailSerializer(account).data)
