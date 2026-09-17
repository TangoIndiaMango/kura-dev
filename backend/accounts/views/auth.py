"""
Auth ViewSet — action-based, thin. Logic lives in AuthService / selectors.
"""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema

from accounts.selectors import me_payload
from accounts.selectors_account import account_for_user
from accounts.serializers import (
    LoginBeginSerializer,
    LoginSerializer,
    LogoutSerializer,
    OnboardingCompleteSerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
    PasswordSetupContextSerializer,
    PasswordSetupSerializer,
    PinLoginSerializer,
    PinSetSerializer,
    PinVerifySerializer,
    ProfileUpdateSerializer,
    PasswordChangeSerializer,
    UserSerializer,
)
from accounts.services import AuthService
from accounts.services.auth import issue_tokens
from accounts.services.devices import DeviceTrustService
from accounts.services.invites import consume_password_setup, peek_setup_token
from accounts.services.profile import change_own_password, update_own_profile
from core.responses import accepted, ok
from core.services.events import emit_event
from core.throttles import AnonBurst, OtpIpThrottle, OtpPhoneThrottle, PinThrottle


class AuthViewSet(viewsets.GenericViewSet):
    """
    /api/v1/auth/login/begin|otp/request|verify|login|pin/login|pin/set|pin/verify|me
    """

    def get_permissions(self):
        if self.action in {
            "otp_request",
            "otp_verify",
            "login",
            "login_begin",
            "pin_login",
            "password_setup_context",
            "password_setup",
        }:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_throttles(self):
        if self.action == "otp_request":
            return [OtpPhoneThrottle(), OtpIpThrottle()]
        if self.action == "login_begin":
            return [AnonBurst()]
        if self.action in {"password_setup_context", "password_setup"}:
            return [AnonBurst()]
        if self.action in {"pin_verify", "pin_set", "pin_login"}:
            return [PinThrottle()]
        return super().get_throttles()

    def get_serializer_class(self):
        return {
            "login": LoginSerializer,
            "login_begin": LoginBeginSerializer,
            "logout": LogoutSerializer,
            "complete_onboarding": OnboardingCompleteSerializer,
            "otp_request": OtpRequestSerializer,
            "otp_verify": OtpVerifySerializer,
            "pin_login": PinLoginSerializer,
            "pin_set": PinSetSerializer,
            "pin_verify": PinVerifySerializer,
            "me": UserSerializer,
            "update_profile": ProfileUpdateSerializer,
            "change_password": PasswordChangeSerializer,
        }.get(self.action, UserSerializer)

    @extend_schema(request=LoginSerializer)
    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = AuthService.staff_login(**ser.validated_data)
        from accounts.models import User

        user = User.objects.get(id=result["user_id"])
        return ok(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "user": UserSerializer(user).data,
            }
        )

    @extend_schema(request=LoginBeginSerializer, responses={202: dict})
    @action(detail=False, methods=["post"], url_path="login/begin")
    def login_begin(self, request):
        """Route returning PIN users without burning OTP throttle / SMS."""
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = AuthService.begin_login(**ser.validated_data)
        return accepted(payload)

    @extend_schema(request=OtpRequestSerializer, responses={202: dict})
    @action(detail=False, methods=["post"], url_path="otp/request")
    def otp_request(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = AuthService.request_otp(**ser.validated_data)
        return accepted(payload)

    @extend_schema(request=OtpVerifySerializer)
    @action(detail=False, methods=["post"], url_path="otp/verify")
    def otp_verify(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = AuthService.verify_otp(**ser.validated_data)
        from accounts.models import User

        user = User.objects.get(id=result["user_id"])
        return ok(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "is_new_user": result["is_new_user"],
                "is_new_device": result["is_new_device"],
                "onboarding_step": result.get("onboarding_step"),
                "channel": result.get("channel"),
                "user": UserSerializer(user).data,
            }
        )

    @extend_schema(request=PinLoginSerializer)
    @action(detail=False, methods=["post"], url_path="pin/login")
    def pin_login(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = AuthService.pin_login(**ser.validated_data)
        from accounts.models import User

        user = User.objects.get(id=result["user_id"])
        return ok(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "is_new_user": result["is_new_user"],
                "is_new_device": result["is_new_device"],
                "onboarding_step": result.get("onboarding_step"),
                "channel": result.get("channel"),
                "has_pin": True,
                "display_name": result.get("display_name"),
                "user": UserSerializer(user).data,
            }
        )

    @extend_schema(request=PinSetSerializer)
    @action(detail=False, methods=["post"], url_path="pin/set")
    def pin_set(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        was_reset = AuthService.set_pin(user=request.user, **ser.validated_data)
        request.user.refresh_from_db(fields=["session_version"])
        tokens = issue_tokens(request.user)
        return ok(
            {
                "status": "success",
                "message": "PIN successfully updated.",
                "was_reset": was_reset,
                **tokens,
            }
        )

    @extend_schema(request=PinVerifySerializer)
    @action(detail=False, methods=["post"], url_path="pin/verify")
    def pin_verify(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        access_jti = None
        auth = getattr(request, "auth", None)
        if auth is not None and hasattr(auth, "get"):
            access_jti = auth.get("jti")
        grant = AuthService.verify_pin(
            user=request.user, pin=ser.validated_data["pin"], access_jti=access_jti
        )
        return ok(
            {
                "status": "verified",
                "pin_grant": grant["pin_grant"],
                "expires_at": grant["expires_at"],
            }
        )

    @extend_schema(request=PasswordSetupContextSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="password-setup/context")
    def password_setup_context(self, request):
        ser = PasswordSetupContextSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(peek_setup_token(raw_token=ser.validated_data["token"]))

    @extend_schema(request=PasswordSetupSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="password-setup")
    def password_setup(self, request):
        ser = PasswordSetupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        user = consume_password_setup(
            raw_token=data["token"],
            password=data["password"],
            password_confirmation=data["password_confirmation"],
        )
        emit_event(
            action="user.password_set",
            subject_type="user",
            subject_id=str(user.id),
            subject_label=user.public_id or user.email,
            actor=user,
        )
        tokens = AuthService.staff_login(
            identifier=user.email, password=data["password"]
        )
        return ok(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": UserSerializer(user).data,
            }
        )

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        return ok(me_payload(request.user))

    @extend_schema(request=LogoutSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="logout")
    def logout(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        AuthService.logout(
            user=request.user,
            refresh=ser.validated_data["refresh"],
        )
        return ok({"status": "logged_out"})

    @extend_schema(request=OnboardingCompleteSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="onboarding/complete")
    def complete_onboarding(self, request):
        AuthService.complete_onboarding(user=request.user)
        return ok({"status": "complete", "onboarding_step": "home"})

    @extend_schema(request=ProfileUpdateSerializer, responses={200: dict})
    @action(detail=False, methods=["patch"], url_path="me/profile")
    def update_profile(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        update_own_profile(user=request.user, **ser.validated_data)
        return ok(me_payload(request.user))

    @extend_schema(request=PasswordChangeSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="password/change")
    def change_password(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        change_own_password(user=request.user, **ser.validated_data)
        return ok({"status": "ok"})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="devices/heartbeat")
    def devices_heartbeat(self, request):
        device_id = (
            request.data.get("device_id")
            or request.headers.get("X-Kura-Device-Id")
            or ""
        ).strip()
        account = account_for_user(request.user)
        row = DeviceTrustService.heartbeat(
            account=account,
            device_id=device_id,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            label=(request.data.get("label") or "")[:80],
        )
        days = max(0, (timezone.now().date() - row.first_seen_at.date()).days)
        return ok(
            {
                "id": str(row.id),
                "status": row.status,
                "trusted_days": days,
                "first_seen_at": row.first_seen_at.isoformat(),
                "last_seen_at": row.last_seen_at.isoformat(),
            }
        )


# Keep refresh on classic view for simplejwt compatibility
TokenRefresh = TokenRefreshView
