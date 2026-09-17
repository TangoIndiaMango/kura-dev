from rest_framework import serializers

from core.services.media import delivery_url
from support.models import CaseEvent, SupportCase


class SupportCaseListSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True)
    assigned_to_id = serializers.UUIDField(read_only=True, allow_null=True)
    payment_id = serializers.UUIDField(read_only=True, allow_null=True)
    account_kura_id = serializers.CharField(source="account.kura_id", read_only=True)
    account_display_name = serializers.CharField(
        source="account.display_name", read_only=True
    )
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportCase
        fields = [
            "id",
            "code",
            "account_id",
            "account_kura_id",
            "account_display_name",
            "kind",
            "priority",
            "status",
            "subject",
            "assigned_to_id",
            "assigned_to_name",
            "payment_id",
            "sla_due_at",
            "created_at",
        ]

    def get_assigned_to_name(self, obj: SupportCase) -> str | None:
        u = obj.assigned_to
        if u is None:
            return None
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        return name or u.email or u.phone or str(u.id)


class CaseEventSerializer(serializers.ModelSerializer):
    actor_id = serializers.UUIDField(read_only=True, allow_null=True)
    actor_name = serializers.SerializerMethodField()
    attachment_id = serializers.UUIDField(read_only=True, allow_null=True)
    attachment_url = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()
    attachment_content_type = serializers.SerializerMethodField()

    class Meta:
        model = CaseEvent
        fields = [
            "id",
            "kind",
            "body",
            "actor_id",
            "actor_name",
            "attachment_id",
            "attachment_url",
            "attachment_name",
            "attachment_content_type",
            "created_at",
        ]

    def get_actor_name(self, obj: CaseEvent) -> str | None:
        u = obj.actor
        if u is None:
            return None
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        return name or u.email or u.phone or str(u.id)

    def get_attachment_url(self, obj: CaseEvent) -> str | None:
        return delivery_url(obj.attachment)

    def get_attachment_name(self, obj: CaseEvent) -> str | None:
        asset = obj.attachment
        if asset is None:
            return None
        return asset.original_filename or None

    def get_attachment_content_type(self, obj: CaseEvent) -> str | None:
        asset = obj.attachment
        return asset.content_type if asset else None


class SupportCaseDetailSerializer(SupportCaseListSerializer):
    events = CaseEventSerializer(many=True, read_only=True)
    driver_id = serializers.UUIDField(read_only=True, allow_null=True)
    opened_by_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta(SupportCaseListSerializer.Meta):
        fields = SupportCaseListSerializer.Meta.fields + [
            "driver_id",
            "opened_by_id",
            "updated_at",
            "events",
        ]


class OpenCaseSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    subject = serializers.CharField(max_length=200)
    kind = serializers.ChoiceField(
        choices=SupportCase.Kind.choices, default=SupportCase.Kind.GENERAL
    )
    priority = serializers.ChoiceField(
        choices=SupportCase.Priority.choices, default=SupportCase.Priority.NORMAL
    )
    body = serializers.CharField(required=False, allow_blank=True, default="")
    driver_id = serializers.UUIDField(required=False, allow_null=True)
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    attachment_asset_id = serializers.UUIDField(required=False, allow_null=True)
    payment_id = serializers.UUIDField(required=False, allow_null=True)


class CaseNoteSerializer(serializers.Serializer):
    body = serializers.CharField(required=False, allow_blank=True, default="")
    attachment_asset_id = serializers.UUIDField(required=False, allow_null=True)


class CaseStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SupportCase.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class CaseAssignSerializer(serializers.Serializer):
    assigned_to_id = serializers.UUIDField(allow_null=True)
