"""Driver read + soft fleet attach / limits — same resource, optional fields."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.filters import DriverFilter
from accounts.models import Account, Driver
from accounts.permissions import HasCapabilityOrReadOwn, user_has_capability
from accounts.selectors import drivers_for
from accounts.serializers import (
    DriverAttachSerializer,
    DriverLimitsSerializer,
    DriverSerializer,
)
from accounts.services.drivers import DriverService
from core.exceptions import DomainError
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok


class DriverViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = DriverSerializer
    pagination_class = KuraPageNumberPagination
    filterset_class = DriverFilter
    search_fields = [
        "user__first_name",
        "user__last_name",
        "user__phone",
        "license_number",
    ]
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "accounts:read",
        "retrieve": "accounts:read",
        "attach": ["accounts:manage", "accounts:write_own"],
        "partial_update": ["accounts:manage", "accounts:write_own"],
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Driver.objects.none()
        return drivers_for(self.request.user)

    def _assert_account_manage(self, account: Account) -> None:
        """Staff or account owner only — peer drivers cannot attach/edit limits."""
        if user_has_capability(self.request.user, "accounts:manage"):
            return
        if account.owner_user_id == self.request.user.id:
            return
        raise DomainError(
            "FORBIDDEN",
            "Only the account owner can manage fleet drivers.",
            http=403,
        )

    @extend_schema(request=DriverAttachSerializer, responses={201: DriverSerializer})
    @action(detail=False, methods=["post"])
    def attach(self, request):
        ser = DriverAttachSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account = Account.objects.filter(pk=data["account_id"]).first()
        if account is None:
            raise DomainError("NOT_FOUND", "Account not found.", http=404)
        self._assert_account_manage(account)
        driver = DriverService.attach(
            account=account,
            phone=data["phone"],
            first_name=data.get("first_name") or "",
            last_name=data.get("last_name") or "",
            license_number=data.get("license_number") or "",
            daily_swap_limit=data.get("daily_swap_limit"),
            daily_spend_kobo_limit=data.get("daily_spend_kobo_limit"),
            actor=request.user,
        )
        row = self.get_queryset().filter(pk=driver.pk).first() or driver
        return created(DriverSerializer(row).data)

    @extend_schema(request=DriverLimitsSerializer, responses={200: DriverSerializer})
    def partial_update(self, request, *args, **kwargs):
        driver = self.get_object()
        self._assert_account_manage(driver.account)
        ser = DriverLimitsSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if not data:
            raise DomainError(
                "VALIDATION_ERROR",
                "Provide daily_swap_limit and/or daily_spend_kobo_limit.",
                http=400,
            )
        updated = DriverService.update_limits(
            driver=driver,
            daily_swap_limit=data.get("daily_swap_limit", ...),
            daily_spend_kobo_limit=data.get("daily_spend_kobo_limit", ...),
            actor=request.user,
        )
        row = self.get_queryset().filter(pk=updated.pk).first() or updated
        return ok(DriverSerializer(row).data)
