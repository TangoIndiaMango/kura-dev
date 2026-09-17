"""Staff IAM ViewSet — invite / activate / deactivate."""
from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.filters import StaffUserFilter
from accounts.helpers.export import staff_user_export_rows
from core.helpers.csv_export import table_export_response
from accounts.models import User
from accounts.permissions import HasCapability
from accounts.selectors import staff_user_stats
from accounts.serializers import StaffInviteSerializer, StaffUpdateSerializer, UserSerializer
from accounts.services import UserService
from accounts.services.users import staff_users_qs
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok


class StaffUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = UserSerializer
    pagination_class = KuraPageNumberPagination
    filterset_class = StaffUserFilter
    search_fields = ["email", "first_name", "last_name", "phone", "public_id"]
    ordering_fields = ["created_at", "email", "first_name"]
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "users:read",
        "retrieve": "users:read",
        "stats": "users:read",
        "export": "users:read",
        "create": "users:manage",
        "partial_update": "users:manage",
        "deactivate": "users:manage",
        "activate": "users:manage",
        "resend_invite": "users:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return staff_users_qs()

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        return ok(
            staff_user_stats(
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
            filename_stem="users",
            title="Kura staff users",
            headers=[
                "user_id",
                "name",
                "email",
                "phone",
                "role",
                "status",
                "last_login",
                "created_at",
            ],
            rows=staff_user_export_rows(qs),
        )

    @extend_schema(request=StaffInviteSerializer, responses={201: UserSerializer})
    def create(self, request, *args, **kwargs):
        ser = StaffInviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        coop_id = data.get("cooperative_id")
        user, invite_meta = UserService.invite_staff(
            actor=request.user,
            email=data["email"],
            role_code=data["role"],
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            phone=data.get("phone", ""),
            password=data.get("password") or None,
            cooperative_id=str(coop_id) if coop_id else None,
            hub_ids=data.get("hub_ids"),
        )
        payload = UserSerializer(user).data
        payload.update(invite_meta)
        return created(payload)

    def partial_update(self, request, *args, **kwargs):
        ser = StaffUpdateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        user = UserService.update_staff(
            user=self.get_object(),
            actor=request.user,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            phone=data.get("phone"),
            role_code=data.get("role"),
            is_active=data.get("is_active"),
            hub_ids=data.get("hub_ids") if "hub_ids" in data else None,
        )
        return ok(UserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="resend-invite")
    def resend_invite(self, request, pk=None):
        meta = UserService.resend_invite(user=self.get_object(), actor=request.user)
        return ok(meta)

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        user = UserService.set_active(
            user=self.get_object(),
            actor=request.user,
            is_active=False,
        )
        return ok(UserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        user = UserService.set_active(
            user=self.get_object(),
            actor=request.user,
            is_active=True,
        )
        return ok(UserSerializer(user).data)
