from rest_framework import serializers
from .models import User, Account, Driver, StaffMembership

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'first_name', 'last_name', 'name', 'role', 'is_active']
        read_only_fields = ['id', 'name', 'role']

    def get_name(self, obj) -> str:
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.phone or obj.email or 'User'

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'kura_id', 'owner_user', 'kind', 'display_name', 'status', 'kyc_status', 'created_at']
        read_only_fields = ['id', 'kura_id', 'created_at']

class DriverSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    account = AccountSerializer(read_only=True)

    class Meta:
        model = Driver
        fields = ['id', 'user', 'account', 'license_number', 'status']

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email or Phone number")
    password = serializers.CharField(required=True, write_only=True)

class OtpRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(required=True)

class OtpVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(required=True)
    code = serializers.CharField(required=True)

class PinVerifySerializer(serializers.Serializer):
    pin = serializers.CharField(required=True, min_length=4, max_length=4)

class PinSetSerializer(serializers.Serializer):
    pin = serializers.CharField(required=True, min_length=4, max_length=4)
