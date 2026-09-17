from rest_framework import serializers

from accounts.models import User
from accounts.services.memberships import hub_ids_for_user


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    assigned_role_code = serializers.CharField(
        source="assigned_role.code", read_only=True, allow_null=True
    )
    assigned_role_name = serializers.CharField(
        source="assigned_role.name", read_only=True, allow_null=True
    )
    hub_ids = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "public_id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "name",
            "role",
            "assigned_role_code",
            "assigned_role_name",
            "hub_ids",
            "is_active",
            "is_staff",
            "last_login",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "public_id",
            "name",
            "role",
            "assigned_role_code",
            "assigned_role_name",
            "hub_ids",
            "is_staff",
            "last_login",
            "created_at",
            "updated_at",
        ]

    def get_name(self, obj) -> str:
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.phone or obj.email or "User"

    def get_hub_ids(self, obj) -> list[str]:
        return hub_ids_for_user(obj)


class StaffInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.CharField(max_length=50)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    cooperative_id = serializers.UUIDField(required=False, allow_null=True)
    hub_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )


class StaffUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    role = serializers.CharField(max_length=50, required=False)
    is_active = serializers.BooleanField(required=False)
    hub_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
