"""Swap ViewSet — F4 multi-step + legacy one-shot complete."""
from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapabilityOrReadOwn
from core.pagination import KuraCursorPagination
from core.responses import ok
from mobility.filters import SwapFilter
from mobility.models import Swap
from mobility.selectors import swaps_for
from mobility.serializers import SwapSerializer
from mobility.serializers.catalogue import (
    IdentityMismatchRequestSerializer,
    RiderPinVerifySerializer,
    SwapAbortRequestSerializer,
    SwapCompleteRequestSerializer,
    SwapIssueRequestSerializer,
    SwapReturnRequestSerializer,
    SwapReverseRequestSerializer,
    SwapSessionCompleteSerializer,
    SwapStartRequestSerializer,
)
from mobility.serializers.velocity import (
    VelocityExceptionRequestSerializer,
    VelocityStatusQuerySerializer,
)
from mobility.services import SwapService


class SwapViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = SwapSerializer
    pagination_class = KuraCursorPagination
    filterset_class = SwapFilter
    capability_map = {
        "list": "swaps:read",
        "retrieve": "swaps:read",
        "start": "swaps:complete",
        "record_return": "swaps:complete",
        "issue": "swaps:complete",
        "complete_session": "swaps:complete",
        "abort": "swaps:complete",
        "complete": "swaps:complete",
        "verify_rider_pin": "swaps:complete",
        "reverse": "swaps:reverse",
        "identity_mismatch": "swaps:complete",
        "velocity_status": "swaps:complete",
        "request_velocity_exception": "swaps:complete",
    }
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Swap.objects.none()
        return swaps_for(self.request.user)

    @extend_schema(request=SwapStartRequestSerializer, responses={201: SwapSerializer})
    @action(detail=False, methods=["post"])
    def start(self, request):
        ser = SwapStartRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        swap = SwapService.start(
            hub_id=data["hub_id"],
            client_event_id=data["client_event_id"],
            reservation_id=data.get("reservation_id"),
            vehicle_id=data.get("vehicle_id"),
            vehicle_qr=data.get("vehicle_qr") or "",
            driver_id=data.get("driver_id"),
            account_id=data.get("account_id"),
            agent=request.user,
        )
        return Response(SwapSerializer(swap).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=SwapReturnRequestSerializer, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="return")
    def record_return(self, request, pk=None):
        ser = SwapReturnRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        swap, mismatch = SwapService.record_return(
            swap=self.get_object(),
            battery_serial=data["battery_serial"],
            charge_pct=data.get("charge_pct", 15),
            mismatch_reason=data.get("mismatch_reason") or "",
            agent=request.user,
        )
        return ok({**SwapSerializer(swap).data, "mismatch": mismatch})

    @extend_schema(request=SwapIssueRequestSerializer, responses={200: SwapSerializer})
    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        ser = SwapIssueRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        swap = SwapService.issue(
            swap=self.get_object(),
            battery_serial=data["battery_serial"],
            charge_pct=data.get("charge_pct", 100),
            agent=request.user,
        )
        return ok(SwapSerializer(swap).data)

    @extend_schema(
        request=SwapSessionCompleteSerializer, responses={200: SwapSerializer}
    )
    @action(detail=True, methods=["post"], url_path="complete")
    def complete_session(self, request, pk=None):
        ser = SwapSessionCompleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        swap = SwapService.complete_session(
            swap=self.get_object(),
            payment_mode=data.get("payment_mode"),
            amount_kobo=data.get("amount_kobo"),
            discount_code=data.get("discount_code") or "",
            rider_pin_grant=data.get("rider_pin_grant") or "",
            override=data.get("override"),
            agent=request.user,
        )
        return ok(SwapSerializer(swap).data)

    @extend_schema(request=SwapAbortRequestSerializer, responses={200: SwapSerializer})
    @action(detail=True, methods=["post"])
    def abort(self, request, pk=None):
        ser = SwapAbortRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        swap = SwapService.abort(
            swap=self.get_object(),
            reason=ser.validated_data.get("reason") or "",
            agent=request.user,
        )
        return ok(SwapSerializer(swap).data)

    @extend_schema(request=SwapReverseRequestSerializer, responses={200: SwapSerializer})
    @action(detail=True, methods=["post"])
    def reverse(self, request, pk=None):
        ser = SwapReverseRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        swap = SwapService.reverse(
            swap=self.get_object(),
            reason=ser.validated_data["reason"],
            actor=request.user,
        )
        return ok(SwapSerializer(swap).data)

    @extend_schema(request=IdentityMismatchRequestSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="identity-mismatch")
    def identity_mismatch(self, request):
        from mobility.services.swap.mismatch import record_identity_mismatch

        ser = IdentityMismatchRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        result = record_identity_mismatch(
            account_id=data["account_id"],
            subject=data.get("subject") or "",
            reason=data["reason"],
            actor=request.user,
            hub_id=data.get("hub_id"),
            reservation_code=data.get("reservation_code") or "",
        )
        return ok(result)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="velocity-status")
    def velocity_status(self, request):
        from risk.services.velocity_bay import velocity_bay_status

        ser = VelocityStatusQuerySerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        return ok(velocity_bay_status(vehicle_id=ser.validated_data["vehicle_id"]))

    @extend_schema(
        request=VelocityExceptionRequestSerializer, responses={200: dict}
    )
    @action(detail=False, methods=["post"], url_path="request-velocity-exception")
    def request_velocity_exception(self, request):
        from accounts.models import Account
        from risk.services.velocity_bay import request_velocity_exception

        ser = VelocityExceptionRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        account = None
        if data.get("account_id"):
            account = Account.objects.filter(pk=data["account_id"]).first()
        event = request_velocity_exception(
            vehicle_id=data["vehicle_id"],
            note=data["note"],
            agent=request.user,
            hub_id=data.get("hub_id"),
            account=account,
        )
        return ok(
            {
                "risk_event_id": str(event.id),
                "status": event.status,
                "exception_requested": True,
            }
        )

    @extend_schema(request=RiderPinVerifySerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="verify-rider-pin")
    def verify_rider_pin(self, request):
        from accounts.models import Account
        from accounts.services.auth import AuthService
        from core.exceptions import DomainError

        ser = RiderPinVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = (
            Account.objects.select_related("owner_user")
            .filter(pk=ser.validated_data["account_id"])
            .first()
        )
        if account is None or account.owner_user_id is None:
            raise DomainError("NOT_FOUND", "Account not found.", http=404)
        grant = AuthService.verify_pin(
            user=account.owner_user,
            pin=ser.validated_data["pin"],
        )
        return ok(
            {
                "status": "verified",
                "pin_grant": grant["pin_grant"],
                "expires_at": grant["expires_at"],
            }
        )

    @extend_schema(
        request=SwapCompleteRequestSerializer, responses={201: SwapSerializer}
    )
    @action(detail=False, methods=["post"])
    def complete(self, request):
        """Legacy one-shot complete — prefer start/return/issue/{id}/complete."""
        serializer = SwapCompleteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        swap = SwapService.complete_swap(
            reservation_id=data.get("reservation_id"),
            hub_id=data["hub_id"],
            vehicle_id=data["vehicle_id"],
            driver_id=data["driver_id"],
            account_id=data["account_id"],
            returned_battery_serial=data.get("returned_battery_serial") or "",
            issued_battery_serial=data["issued_battery_serial"],
            returned_charge_pct=data.get("returned_charge_pct", 15),
            issued_charge_pct=data.get("issued_charge_pct", 100),
            amount_kobo=data.get("amount_kobo"),
            payment_mode=data.get("payment_mode"),
            discount_code=data.get("discount_code") or "",
            rider_pin_grant=data.get("rider_pin_grant") or "",
            override=data.get("override"),
            agent=request.user,
        )
        return Response(SwapSerializer(swap).data, status=status.HTTP_201_CREATED)
