from rest_framework import serializers

from accounts.models import Permission, Role


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "code", "name", "module", "description"]


class RoleListSerializer(serializers.ModelSerializer):
    """Table / picker payload — no nested permission trees."""

    user_count = serializers.IntegerField(read_only=True)
    permission_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = [
            "id",
            "code",
            "name",
            "description",
            "is_system",
            "is_active",
            "user_count",
            "permission_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RoleDetailSerializer(serializers.ModelSerializer):
    """Single-role payload — full grants for detail / edit / mutations."""

    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    user_count = serializers.IntegerField(read_only=True)
    permission_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = [
            "id",
            "code",
            "name",
            "description",
            "is_system",
            "is_active",
            "permissions",
            "permission_ids",
            "user_count",
            "permission_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_system",
            "user_count",
            "permission_count",
            "created_at",
            "updated_at",
            "permissions",
        ]


RoleSerializer = RoleDetailSerializer
