from rest_framework import serializers

from operations.models import Alert, Override, Shift


class ShiftSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source="agent.first_name", read_only=True)
    hub_code = serializers.CharField(source="hub.code", read_only=True)
    hub_name = serializers.CharField(source="hub.name", read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id",
            "agent",
            "agent_name",
            "hub",
            "hub_code",
            "hub_name",
            "opened_at",
            "closed_at",
            "opening_cash_kobo",
            "closing_cash_kobo",
            "status",
            "created_at",
            "updated_at",
        ]


class OverrideSerializer(serializers.ModelSerializer):
    agent_email = serializers.CharField(source="agent.email", read_only=True)
    swap_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = Override
        fields = [
            "id",
            "swap_id",
            "agent",
            "agent_email",
            "reason",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class OverrideCreateSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=50)
    note = serializers.CharField(max_length=2000)
    pin_grant = serializers.CharField()
    swap_id = serializers.UUIDField(required=False, allow_null=True)


class AlertListSerializer(serializers.ModelSerializer):
    hub_id = serializers.UUIDField(read_only=True, allow_null=True)
    hub_code = serializers.CharField(
        source="hub.code", read_only=True, allow_null=True
    )
    hub_name = serializers.CharField(
        source="hub.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Alert
        fields = [
            "id",
            "kind",
            "severity",
            "status",
            "message",
            "hub_id",
            "hub_code",
            "hub_name",
            "delivery_channel",
            "is_resolved",
            "created_at",
            "acknowledged_at",
            "resolved_at",
        ]


class AlertDetailSerializer(AlertListSerializer):
    acknowledged_by_id = serializers.UUIDField(read_only=True, allow_null=True)
    resolved_by_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta(AlertListSerializer.Meta):
        fields = AlertListSerializer.Meta.fields + [
            "resolve_note",
            "acknowledged_by_id",
            "resolved_by_id",
            "updated_at",
        ]


class AlertNoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
