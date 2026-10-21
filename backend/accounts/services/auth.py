"""Auth domain services — OTP, tokens, PIN. No HTTP / serializer create hooks."""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from accounts.models import Account, Driver, OtpChallenge, User
from accounts.helpers.phones import normalize_ng_phone
from core.exceptions import DomainError
from core.ids import uuid7
from core.services.events import NotifySpec, emit_event
from notifications.models import Notification

logger = logging.getLogger("kura.auth")

OTP_TTL = timedelta(minutes=5)
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN = timedelta(seconds=60)
PIN_LOCK_AFTER = 3
PIN_LOCK_SECONDS = 30
PIN_GRANT_TTL = timedelta(minutes=2)


def _otp_pepper() -> bytes:
    return (getattr(settings, "OTP_PEPPER", None) or settings.SECRET_KEY).encode()


def hash_otp(code: str) -> str:
    return hmac.new(_otp_pepper(), code.encode(), hashlib.sha256).hexdigest()


def issue_tokens(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["session_version"] = user.session_version
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def issue_pin_grant(user: User, access_jti: str | None = None) -> dict:
    token = AccessToken()
    token["user_id"] = str(user.id)
    token["scope"] = "pin"
    if access_jti:
        token["parent_jti"] = access_jti
    token.set_exp(from_time=timezone.now(), lifetime=PIN_GRANT_TTL)
    return {
        "pin_grant": str(token),
        "expires_at": timezone.now() + PIN_GRANT_TTL,
    }


def assert_pin_grant(*, token: str, user_id) -> None:
    """Validate a short-lived pin_grant JWT for the expected user."""
    raw = (token or "").strip()
    if not raw:
        raise DomainError(
            "PIN_GRANT_REQUIRED",
            "Rider PIN confirmation is required for this wallet debit.",
            http=403,
        )
    try:
        access = AccessToken(raw)
    except Exception as exc:
        raise DomainError(
            "PIN_GRANT_INVALID",
            "PIN confirmation expired or invalid. Ask the rider to enter PIN again.",
            http=401,
        ) from exc
    if access.get("scope") != "pin":
        raise DomainError("PIN_GRANT_INVALID", "Invalid PIN confirmation.", http=401)
    if str(access.get("user_id") or "") != str(user_id):
        raise DomainError(
            "PIN_GRANT_INVALID",
            "PIN confirmation does not match this rider.",
            http=401,
        )


def _wat(dt):
    """Riders and staff read hub-local (Lagos) time, not UTC."""
    from zoneinfo import ZoneInfo

    from django.conf import settings

    return dt.astimezone(ZoneInfo(getattr(settings, "DISPLAY_TIME_ZONE", "Africa/Lagos")))


class AuthService:
    @staticmethod
    @transaction.atomic
    def complete_onboarding(*, user: User) -> None:
        locked = User.objects.select_for_update().get(pk=user.pk)
        account = (
            Account.objects.select_for_update()
            .filter(owner_user_id=locked.pk)
            .order_by("created_at")
            .first()
        )
        if account is None:
            raise DomainError(
                "ACCOUNT_REQUIRED",
                "Complete your profile before finishing onboarding.",
                http=409,
            )
        before = locked.onboarding_step
        locked.onboarding_step = User.OnboardingStep.DONE
        locked.save(update_fields=["onboarding_step", "updated_at"])
        emit_event(
            action="account.onboarding_completed",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=account.kura_id or account.display_name,
            actor=locked,
            before={"onboarding_step": before},
            after={"onboarding_step": locked.onboarding_step},
        )

    @staticmethod
    @transaction.atomic
    def logout(*, user: User, refresh: str) -> None:
        revoked = True
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            revoked = False
        emit_event(
            action="auth.logout",
            subject_type="user",
            subject_id=str(user.id),
            subject_label=user.public_id or str(user.id),
            actor=user,
            metadata={"refresh_revoked": revoked},
        )

    @staticmethod
    def _normalize_channel(channel: str) -> str:
        value = (channel or OtpChallenge.Channel.WEB).upper()
        if value not in OtpChallenge.Channel.values:
            raise DomainError(
                "VALIDATION_ERROR",
                "Invalid client channel.",
                details={"channel": ["Must be WEB, APP, USSD, or HUB"]},
            )
        return value

    @staticmethod
    def begin_login(*, phone: str, channel: str = "WEB") -> dict:
        """
        Entry router — no SMS, no OTP throttle.
        next=pin when account has a PIN; otherwise next=otp (client then calls otp/request).
        """
        e164 = normalize_ng_phone(phone)
        channel = AuthService._normalize_channel(channel)
        user = User.objects.filter(phone=e164, is_active=True).first()
        if user and user.pin_hash:
            name = f"{user.first_name} {user.last_name}".strip()
            if not name:
                account = user.accounts.order_by("created_at").first()
                name = (account.display_name if account else "") or ""
            return {
                "status": "accepted",
                "next": "pin",
                "message": "Enter your PIN to continue.",
                "phone": e164,
                "purpose": "LOGIN",
                "channel": channel,
                "has_pin": True,
                "display_name": name or None,
            }
        return {
            "status": "accepted",
            "next": "otp",
            "message": "We'll text a 6-digit code to this number.",
            "phone": e164,
            "purpose": "LOGIN",
            "channel": channel,
            "has_pin": False,
        }

    @staticmethod
    def request_otp(
        *,
        phone: str,
        purpose: str = "LOGIN",
        device_id: str = "",
        channel: str = "WEB",
        force_otp: bool = False,
    ) -> dict:
        """
        Always succeeds for valid phone (no existence leak for unknown numbers).
        LOGIN + existing PIN → next=pin (no SMS), unless force_otp.
        Otherwise issue OTP → next=otp.
        """
        e164 = normalize_ng_phone(phone)
        purpose = (purpose or "LOGIN").upper()
        channel = AuthService._normalize_channel(channel)
        if purpose not in OtpChallenge.Purpose.values:
            raise DomainError(
                "VALIDATION_ERROR",
                "Invalid OTP purpose.",
                details={"purpose": ["invalid"]},
            )

        if purpose == "LOGIN" and not force_otp:
            routed = AuthService.begin_login(phone=e164, channel=channel)
            if routed["next"] == "pin":
                return routed

        recent = (
            OtpChallenge.objects.filter(phone=e164, purpose=purpose, consumed_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if recent and recent.created_at > timezone.now() - OTP_RESEND_COOLDOWN:
            raise DomainError(
                "OTP_TOO_MANY",
                "Please wait before requesting another code.",
                http=429,
                details={"retry_after_seconds": 60},
            )

        code = f"{secrets.randbelow(1_000_000):06d}"
        if settings.DEBUG:
            logger.info(
                "otp_issued phone=%s purpose=%s channel=%s code=%s",
                e164[-4:],
                purpose,
                channel,
                code,
            )

        OtpChallenge.objects.create(
            id=uuid7(),
            phone=e164,
            purpose=purpose,
            channel=channel,
            code_hash=hash_otp(code),
            expires_at=timezone.now() + OTP_TTL,
            device_id=device_id or "",
        )
        return {
            "status": "accepted",
            "next": "otp",
            "message": "If this number can receive SMS, a code is on its way.",
            "phone": e164,
            "purpose": purpose,
            "channel": channel,
            "has_pin": False,
        }

    @staticmethod
    @transaction.atomic
    def verify_otp(
        *,
        phone: str,
        code: str,
        purpose: str = "LOGIN",
        device_id: str = "",
        channel: str = "WEB",
    ) -> dict:
        e164 = normalize_ng_phone(phone)
        purpose = (purpose or "LOGIN").upper()
        channel = AuthService._normalize_channel(channel)
        code = (code or "").strip()

        challenge = (
            OtpChallenge.objects.select_for_update()
            .filter(phone=e164, purpose=purpose, consumed_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if challenge is None:
            raise DomainError("OTP_INVALID", "The verification code is invalid or expired.")

        if challenge.expires_at <= timezone.now():
            raise DomainError("OTP_EXPIRED", "This verification code has expired. Request a new one.")

        if challenge.attempts >= OTP_MAX_ATTEMPTS:
            challenge.consumed_at = timezone.now()
            challenge.save(update_fields=["consumed_at", "updated_at"])
            raise DomainError(
                "OTP_TOO_MANY",
                "Too many incorrect attempts. Request a new code.",
                http=429,
            )

        dev_code = getattr(settings, "OTP_DEV_CODE", "123456")
        valid = hmac.compare_digest(challenge.code_hash, hash_otp(code))
        if settings.DEBUG and code == dev_code:
            valid = True

        if not valid:
            challenge.attempts += 1
            challenge.save(update_fields=["attempts", "updated_at"])
            remaining = OTP_MAX_ATTEMPTS - challenge.attempts
            raise DomainError(
                "OTP_INVALID",
                "The verification code entered is incorrect.",
                details={"attempts_remaining": max(remaining, 0)},
            )

        challenge.consumed_at = timezone.now()
        challenge.save(update_fields=["consumed_at", "updated_at"])

        user = User.objects.filter(phone=e164).first()
        is_new_user = False
        if user is None:
            is_new_user = True
            user = AuthService._provision_operator(e164, channel=channel)
        elif not user.is_active:
            raise DomainError("AUTH_DISABLED", "This account is disabled.", http=403)

        tokens = issue_tokens(user)
        return {
            **tokens,
            "is_new_user": is_new_user,
            "is_new_device": bool(device_id),
            "user_id": str(user.id),
            "onboarding_step": user.onboarding_step,
            "channel": channel,
        }

    @staticmethod
    def _provision_operator(phone_e164: str, *, channel: str) -> User:
        user = User.objects.create(
            phone=phone_e164,
            role=User.Role.DRIVER,
            first_name="",
            last_name="",
            onboarding_step=User.OnboardingStep.PIN,
        )
        account = Account.objects.create(
            owner_user=user,
            kind=Account.Kind.INDIVIDUAL,
            display_name=f"Rider {phone_e164[-4:]}",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.NONE,
            registration_channel=channel
            if channel in Account.RegistrationChannel.values
            else Account.RegistrationChannel.WEB,
        )
        Driver.objects.create(user=user, account=account)
        return user

    @staticmethod
    def staff_login(*, identifier: str, password: str) -> dict:
        identifier = (identifier or "").strip()
        user = None
        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            try:
                user = User.objects.filter(phone=normalize_ng_phone(identifier)).first()
            except DomainError:
                user = User.objects.filter(phone=identifier).first()

        if not user or not user.check_password(password):
            raise DomainError("AUTH_INVALID", "Invalid email/phone or password.", http=401)
        if not user.is_active:
            raise DomainError("AUTH_DISABLED", "This account is disabled.", http=403)
        if not (user.is_staff or user.is_superuser):
            raise DomainError("AUTH_INVALID", "Invalid email/phone or password.", http=401)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login", "updated_at"])
        label = user.public_id or (user.email or user.phone or str(user.id))
        display = f"{user.first_name} {user.last_name}".strip() or label
        when = user.last_login
        emit_event(
            action="auth.staff_login",
            subject_type="user",
            subject_id=str(user.id),
            subject_label=label,
            actor=user,
            metadata={"channel": "staff", "email": user.email or ""},
            notify=NotifySpec(
                user=user,
                title="Console sign-in",
                body=(
                    f"{display} ({label}) signed in to the admin console at "
                    f"{_wat(when).strftime('%d %b %Y · %H:%M')} WAT."
                ),
                source="System",
                severity=Notification.Severity.INFO,
                link_path="/audit",
                template_code="auth.staff_login",
                params={
                    "user_id": str(user.id),
                    "public_id": user.public_id or "",
                    "email": user.email or "",
                    "channel": "staff",
                    "at": when.isoformat(),
                },
            ),
        )
        return {**issue_tokens(user), "user_id": str(user.id), "public_id": user.public_id}

    @staticmethod
    def pin_login(*, phone: str, pin: str, channel: str = "WEB") -> dict:
        """Returning operator: phone + PIN → JWT session (no OTP)."""
        e164 = normalize_ng_phone(phone)
        user = User.objects.filter(phone=e164).first()
        if user is None or not user.is_active:
            raise DomainError("PIN_INVALID", "The security PIN entered is incorrect.", http=401)
        if not user.pin_hash:
            raise DomainError(
                "PIN_INVALID",
                "Security PIN has not been set yet. Request a login code instead.",
                http=401,
            )
        # Reuse lockout + check logic; discard pin grant — we need session tokens.
        AuthService.verify_pin(user=user, pin=pin, access_jti=None)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login", "updated_at"])
        tokens = issue_tokens(user)
        name = f"{user.first_name} {user.last_name}".strip()
        if not name:
            account = user.accounts.order_by("created_at").first()
            name = (account.display_name if account else "") or ""
        label = user.public_id or user.phone or str(user.id)
        display = name or label
        when = user.last_login
        ch = AuthService._normalize_channel(channel)
        emit_event(
            action="auth.operator_login",
            subject_type="user",
            subject_id=str(user.id),
            subject_label=label,
            actor=user,
            metadata={"channel": ch, "phone": user.phone or ""},
            notify=NotifySpec(
                user=user,
                title="Operator sign-in",
                body=(
                    f"{display} ({label}) signed in on {ch} at "
                    f"{_wat(when).strftime('%d %b %Y · %H:%M')} WAT."
                ),
                source="System",
                severity=Notification.Severity.INFO,
                channels=(Notification.Channel.IN_APP,),
                link_path="/account",
                template_code="auth.operator_login",
                params={
                    "user_id": str(user.id),
                    "public_id": user.public_id or "",
                    "phone": user.phone or "",
                    "channel": ch,
                    "at": when.isoformat(),
                },
            ),
        )
        return {
            **tokens,
            "user_id": str(user.id),
            "is_new_user": False,
            "is_new_device": False,
            "onboarding_step": user.onboarding_step,
            "channel": ch,
            "display_name": name or None,
            "has_pin": True,
        }

    @staticmethod
    @transaction.atomic
    def set_pin(*, user: User, pin: str, pin_confirm: str | None = None) -> bool:
        pin = (pin or "").strip()
        if not pin.isdigit() or len(pin) != 4:
            raise DomainError(
                "VALIDATION_ERROR",
                "PIN must be exactly 4 digits.",
                details={"pin": ["invalid"]},
            )
        if pin_confirm is not None and pin != pin_confirm:
            raise DomainError(
                "VALIDATION_ERROR",
                "PIN confirmation does not match.",
                details={"pin_confirm": ["mismatch"]},
            )
        user = User.objects.select_for_update().get(pk=user.pk)
        is_reset = bool(user.pin_hash)
        user.set_pin(pin)
        user.pin_failed_attempts = 0
        user.pin_locked_until = None
        updates = ["pin_hash", "pin_failed_attempts", "pin_locked_until", "updated_at"]
        if user.onboarding_step == User.OnboardingStep.PIN:
            user.onboarding_step = User.OnboardingStep.PROFILE
            updates.append("onboarding_step")
        if is_reset:
            user.session_version += 1
            updates.append("session_version")
        user.save(update_fields=updates)

        emit_event(
            action="auth.pin_reset" if is_reset else "auth.pin_set",
            subject_type="user",
            subject_id=str(user.id),
            actor=user,
            metadata={"onboarding_step": user.onboarding_step},
            notify=(
                NotifySpec(
                    user=user,
                    title="Security PIN changed",
                    body="Your KURA security PIN was changed. Other sessions were signed out.",
                    source="Security",
                    severity=Notification.Severity.WARNING,
                    link_path="/account",
                    template_code="auth.pin_reset",
                    dedupe_key=f"auth.pin_reset:{user.id}:{user.session_version}",
                )
                if is_reset
                else None
            ),
        )
        return is_reset

    @staticmethod
    def verify_pin(*, user: User, pin: str, access_jti: str | None = None) -> dict:
        if user.pin_locked_until and user.pin_locked_until > timezone.now():
            raise DomainError(
                "PIN_LOCKED",
                "PIN temporarily locked. Try again shortly.",
                http=429,
            )
        if not user.pin_hash:
            raise DomainError("PIN_INVALID", "Security PIN has not been set yet.")

        if not user.check_pin(pin):
            user.pin_failed_attempts = (user.pin_failed_attempts or 0) + 1
            updates = ["pin_failed_attempts", "updated_at"]
            if user.pin_failed_attempts >= PIN_LOCK_AFTER:
                user.pin_locked_until = timezone.now() + timedelta(seconds=PIN_LOCK_SECONDS)
                user.pin_failed_attempts = 0
                updates.append("pin_locked_until")
            user.save(update_fields=updates)
            raise DomainError("PIN_INVALID", "The security PIN entered is incorrect.", http=401)

        user.pin_failed_attempts = 0
        user.pin_locked_until = None
        user.save(update_fields=["pin_failed_attempts", "pin_locked_until", "updated_at"])
        return issue_pin_grant(user, access_jti=access_jti)
