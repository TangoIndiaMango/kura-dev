"""DRF throttle classes — rates live in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']."""
from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class UserBurst(UserRateThrottle):
    scope = "user_burst"


class UserSustained(UserRateThrottle):
    scope = "user_sustained"


class AnonBurst(AnonRateThrottle):
    scope = "anon"


class OtpPhoneThrottle(SimpleRateThrottle):
    scope = "otp_phone"

    def get_cache_key(self, request, view):
        phone = ""
        if hasattr(request, "data"):
            phone = str(request.data.get("phone", "")).strip()
        if not phone:
            return None
        return self.cache_format % {"scope": self.scope, "ident": phone}


class OtpIpThrottle(AnonRateThrottle):
    scope = "otp_ip"


class PinThrottle(UserRateThrottle):
    scope = "pin"


class MediaUploadThrottle(UserRateThrottle):
    scope = "media_upload"


class WebhookThrottle(AnonRateThrottle):
    scope = "webhook"
