from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)


class LoginBeginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    channel = serializers.ChoiceField(
        choices=["WEB", "APP", "USSD", "HUB"],
        default="WEB",
        required=False,
    )


class OtpRequestSerializer(serializers.Serializer):
    phone = serializers.CharField()
    purpose = serializers.ChoiceField(
        choices=["LOGIN", "REGISTER", "PHONE_CHANGE", "PIN_RESET", "AGENT_ACTION"],
        default="LOGIN",
        required=False,
    )
    channel = serializers.ChoiceField(
        choices=["WEB", "APP", "USSD", "HUB"],
        default="WEB",
        required=False,
    )
    device_id = serializers.CharField(required=False, allow_blank=True, default="")
    # Forgot-PIN path: always SMS even when the account already has a PIN.
    force_otp = serializers.BooleanField(required=False, default=False)


class OtpVerifySerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField()
    purpose = serializers.ChoiceField(
        choices=["LOGIN", "REGISTER", "PHONE_CHANGE", "PIN_RESET", "AGENT_ACTION"],
        default="LOGIN",
        required=False,
    )
    channel = serializers.ChoiceField(
        choices=["WEB", "APP", "USSD", "HUB"],
        default="WEB",
        required=False,
    )
    device_id = serializers.CharField(required=False, allow_blank=True, default="")


class PinVerifySerializer(serializers.Serializer):
    pin = serializers.CharField(min_length=4, max_length=4)


class PinLoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    pin = serializers.CharField(min_length=4, max_length=4)
    channel = serializers.ChoiceField(
        choices=["WEB", "APP", "USSD", "HUB"],
        default="WEB",
        required=False,
    )


class PinSetSerializer(serializers.Serializer):
    pin = serializers.CharField(min_length=4, max_length=4)
    pin_confirm = serializers.CharField(min_length=4, max_length=4, required=False)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)


class OnboardingCompleteSerializer(serializers.Serializer):
    pass


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    avatar_asset_id = serializers.UUIDField(required=False, allow_null=True)
    notification_prefs = serializers.DictField(required=False)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password_confirmation = serializers.CharField(write_only=True)
