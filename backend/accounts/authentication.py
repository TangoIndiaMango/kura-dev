from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class SessionVersionJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_version = validated_token.get("session_version", 0)
        if token_version != user.session_version:
            raise AuthenticationFailed(
                "Session expired. Sign in again.",
                code="session_revoked",
            )
        return user
