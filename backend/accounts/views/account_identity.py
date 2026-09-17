"""Identity + KYC + rider-notify actions for AccountViewSet."""
from __future__ import annotations

from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema

from accounts.serializers import (
    AccountCrmDetailSerializer,
    AccountNotifySerializer,
    IdentityAdjustPhotosSerializer,
    IdentityRejectSerializer,
    IdentityRequestPhotosSerializer,
    IdentitySubmitSerializer,
    IdentityVerifySerializer,
)
from accounts.services import AccountService, IdentityService
from core.responses import created, ok


class AccountIdentityActionsMixin:
    @extend_schema(request=IdentitySubmitSerializer, responses={201: dict})
    @action(detail=False, methods=["post"], url_path="identity")
    def identity(self, request):
        ser = IdentitySubmitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return created(IdentityService.submit(user=request.user, **ser.validated_data))

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["post"], url_path="identity/withdraw")
    def identity_withdraw(self, request):
        return ok(IdentityService.withdraw(user=request.user))

    @extend_schema(request=IdentityAdjustPhotosSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="identity/photos")
    def identity_photos(self, request):
        ser = IdentityAdjustPhotosSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(
            IdentityService.adjust_photos(user=request.user, **ser.validated_data)
        )

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"], url_path="kyc")
    def kyc(self, request, pk=None):
        return ok(IdentityService.kyc_payload(self.get_object()))

    @extend_schema(request=IdentityVerifySerializer, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="kyc/verify")
    def verify_kyc(self, request, pk=None):
        ser = IdentityVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(
            IdentityService.verify(
                account=self.get_object(),
                actor=request.user,
                **ser.validated_data,
            )
        )

    @extend_schema(request=IdentityRejectSerializer, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="kyc/reject")
    def reject_kyc(self, request, pk=None):
        ser = IdentityRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(
            IdentityService.reject(
                account=self.get_object(),
                actor=request.user,
                **ser.validated_data,
            )
        )

    @extend_schema(request=IdentityRequestPhotosSerializer, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="kyc/request-photos")
    def request_kyc_photos(self, request, pk=None):
        ser = IdentityRequestPhotosSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(
            IdentityService.request_photos(
                account=self.get_object(),
                actor=request.user,
                **ser.validated_data,
            )
        )

    @extend_schema(
        request=AccountNotifySerializer,
        responses={200: AccountCrmDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="notify")
    def notify_rider(self, request, pk=None):
        ser = AccountNotifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = AccountService.notify_rider(
            account=self.get_object(),
            actor=request.user,
            message=ser.validated_data["message"],
        )
        return ok(AccountCrmDetailSerializer(account).data)
