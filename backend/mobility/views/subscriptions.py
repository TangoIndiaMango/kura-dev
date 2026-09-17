"""Subscription purchase / renew / cancel / switch / auto_renew."""
from __future__ import annotations

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapabilityOrReadOwn
from core.pagination import KuraPageNumberPagination
from core.responses import ok
from mobility.filters import SubscriptionFilter
from mobility.models import Plan, Subscription, Vehicle
from mobility.selectors import subscriptions_for
from mobility.serializers.catalogue import SubscriptionSerializer
from mobility.services.plans.switch_preview import preview_to_dict
from mobility.services.plans.subscriptions import SubscriptionService


class SubscriptionPurchaseSerializer(serializers.Serializer):
    vehicle = serializers.UUIDField()
    plan = serializers.UUIDField()
    auto_renew = serializers.BooleanField(required=False, allow_null=True, default=None)
    discount_code = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")
    pin_grant = serializers.CharField(required=True, allow_blank=False)
    payment_mode = serializers.ChoiceField(
        choices=["WALLET"], default="WALLET", required=False
    )
    channel = serializers.ChoiceField(
        choices=["App", "USSD", "Hub"], default="App", required=False
    )


class SubscriptionRenewSerializer(serializers.Serializer):
    discount_code = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")
    pin_grant = serializers.CharField(required=True, allow_blank=False)
    channel = serializers.ChoiceField(
        choices=["App", "USSD", "Hub"], default="App", required=False
    )


class SubscriptionSwitchSerializer(serializers.Serializer):
    plan = serializers.UUIDField()
    immediate = serializers.BooleanField(required=False, allow_null=True, default=None)
    discount_code = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")
    pin_grant = serializers.CharField(required=False, allow_blank=True, default="")
    channel = serializers.ChoiceField(
        choices=["App", "USSD", "Hub"], default="App", required=False
    )


class SubscriptionSwitchPreviewSerializer(serializers.Serializer):
    plan = serializers.UUIDField()
    immediate = serializers.BooleanField(required=False, allow_null=True, default=None)
    discount_code = serializers.CharField(required=False, allow_blank=True, default="")
    channel = serializers.ChoiceField(
        choices=["App", "USSD", "Hub"], default="App", required=False
    )


class SubscriptionCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class SubscriptionAutoRenewSerializer(serializers.Serializer):
    auto_renew = serializers.BooleanField()


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = SubscriptionSerializer
    pagination_class = KuraPageNumberPagination
    filterset_class = SubscriptionFilter
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "swaps:read",
        "retrieve": "swaps:read",
        "create": "swaps:read",
        "renew": "swaps:read",
        "switch": "swaps:read",
        "switch_preview": "swaps:read",
        "cancel": "swaps:read",
        "auto_renew": "swaps:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Subscription.objects.none()
        return subscriptions_for(self.request.user)

    def _own_account(self, user):
        driver = getattr(user, "driver_profile", None)
        if driver is not None:
            return driver.account
        return user.accounts.order_by("created_at").first()

    @extend_schema(
        request=SubscriptionPurchaseSerializer, responses={201: SubscriptionSerializer}
    )
    def create(self, request, *args, **kwargs):
        ser = SubscriptionPurchaseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account = self._own_account(request.user)
        if account is None:
            return Response(
                {"error": {"code": "ACCOUNT_REQUIRED", "message": "Complete profile."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vehicle = Vehicle.objects.select_related("vehicle_model").get(
            pk=data["vehicle"]
        )
        plan = Plan.objects.get(pk=data["plan"])
        sub = SubscriptionService.purchase(
            account=account,
            vehicle=vehicle,
            plan=plan,
            actor=request.user,
            auto_renew=data.get("auto_renew"),
            discount_code=data.get("discount_code") or "",
            idempotency_key=data.get("idempotency_key") or "",
            channel=data.get("channel") or "App",
            payment_mode=data.get("payment_mode") or "WALLET",
            pin_grant=data.get("pin_grant") or "",
        )
        return Response(
            SubscriptionSerializer(sub).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(
        request=SubscriptionRenewSerializer, responses={200: SubscriptionSerializer}
    )
    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        ser = SubscriptionRenewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        sub = SubscriptionService.renew(
            subscription=self.get_object(),
            actor=request.user,
            discount_code=data.get("discount_code") or "",
            idempotency_key=data.get("idempotency_key") or "",
            channel=data.get("channel") or "App",
            pin_grant=data.get("pin_grant") or "",
        )
        return ok(SubscriptionSerializer(sub).data)

    @extend_schema(
        request=SubscriptionSwitchPreviewSerializer, responses={200: dict}
    )
    @action(detail=True, methods=["post"], url_path="switch-preview")
    def switch_preview(self, request, pk=None):
        ser = SubscriptionSwitchPreviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        plan = Plan.objects.get(pk=data["plan"])
        preview = SubscriptionService.preview_switch(
            subscription=self.get_object(),
            plan=plan,
            immediate=data.get("immediate"),
            discount_code=data.get("discount_code") or "",
            channel=data.get("channel") or "App",
        )
        return ok(preview_to_dict(preview))

    @extend_schema(
        request=SubscriptionSwitchSerializer, responses={200: SubscriptionSerializer}
    )
    @action(detail=True, methods=["post"])
    def switch(self, request, pk=None):
        ser = SubscriptionSwitchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        plan = Plan.objects.get(pk=data["plan"])
        sub = SubscriptionService.switch(
            subscription=self.get_object(),
            plan=plan,
            actor=request.user,
            immediate=data.get("immediate"),
            discount_code=data.get("discount_code") or "",
            idempotency_key=data.get("idempotency_key") or "",
            channel=data.get("channel") or "App",
            pin_grant=data.get("pin_grant") or "",
        )
        return ok(SubscriptionSerializer(sub).data)

    @extend_schema(
        request=SubscriptionCancelSerializer, responses={200: SubscriptionSerializer}
    )
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        ser = SubscriptionCancelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sub = SubscriptionService.cancel(
            subscription=self.get_object(),
            actor=request.user,
            reason=ser.validated_data.get("reason") or "",
        )
        return ok(SubscriptionSerializer(sub).data)

    @extend_schema(
        request=SubscriptionAutoRenewSerializer, responses={200: SubscriptionSerializer}
    )
    @action(detail=True, methods=["patch", "post"], url_path="auto-renew")
    def auto_renew(self, request, pk=None):
        ser = SubscriptionAutoRenewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sub = SubscriptionService.set_auto_renew(
            subscription=self.get_object(),
            auto_renew=ser.validated_data["auto_renew"],
            actor=request.user,
        )
        return ok(SubscriptionSerializer(sub).data)
