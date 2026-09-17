"""Cooperative catalogue serializers (CRM dropdown, not IAM)."""
from __future__ import annotations

from rest_framework import serializers

from accounts.models import Cooperative


class CooperativeListSerializer(serializers.ModelSerializer):
    chairman_user_id = serializers.UUIDField(
        source="chairman_user.id", read_only=True, allow_null=True
    )
    chairman_email = serializers.EmailField(
        source="chairman_user.email", read_only=True, allow_null=True
    )
    member_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Cooperative
        fields = [
            "id",
            "name",
            "region",
            "status",
            "chairman_user_id",
            "chairman_email",
            "member_count",
            "created_at",
        ]


class CooperativeDetailSerializer(CooperativeListSerializer):
    account_ids = serializers.SerializerMethodField()

    class Meta(CooperativeListSerializer.Meta):
        fields = [
            *CooperativeListSerializer.Meta.fields,
            "account_ids",
            "updated_at",
        ]

    def get_account_ids(self, obj: Cooperative) -> list[str]:
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("accounts")
        if cached is not None:
            return [str(a.id) for a in cached]
        return [str(i) for i in obj.accounts.values_list("id", flat=True)]


class CooperativeWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    region = serializers.CharField(max_length=100, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Cooperative.Status.choices, required=False
    )


class AccountCooperativeSerializer(serializers.Serializer):
    cooperative_id = serializers.UUIDField(allow_null=True)
