from rest_framework import serializers

from risk.models import RiskEvent, RiskRule


class RiskRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskRule
        fields = ["id", "code", "name", "severity", "action", "enabled", "params"]


class RiskEventListSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True, allow_null=True)
    account_kura_id = serializers.CharField(
        source="account.kura_id", read_only=True, allow_null=True
    )
    account_display_name = serializers.CharField(
        source="account.display_name", read_only=True, allow_null=True
    )
    rule_code = serializers.CharField(source="rule.code", read_only=True)
    rule_name = serializers.CharField(source="rule.name", read_only=True)

    class Meta:
        model = RiskEvent
        fields = [
            "id",
            "account_id",
            "account_kura_id",
            "account_display_name",
            "rule_code",
            "rule_name",
            "subject_type",
            "subject_id",
            "severity",
            "score",
            "action_taken",
            "status",
            "created_at",
        ]


class RiskEventDetailSerializer(RiskEventListSerializer):
    reviewed_by_id = serializers.UUIDField(read_only=True, allow_null=True)
    active_velocity_grant = serializers.SerializerMethodField()

    class Meta(RiskEventListSerializer.Meta):
        fields = RiskEventListSerializer.Meta.fields + [
            "context",
            "review_note",
            "reviewed_by_id",
            "active_velocity_grant",
            "updated_at",
        ]

    def get_active_velocity_grant(self, obj):
        from django.utils import timezone
        from risk.models import RiskVelocityGrant

        grant = (
            obj.velocity_grants.filter(
                status=RiskVelocityGrant.Status.ACTIVE,
                expires_at__gt=timezone.now(),
                uses_remaining__gt=0,
            )
            .order_by("-created_at")
            .first()
        )
        if grant is None:
            return None
        return {
            "id": str(grant.id),
            "expires_at": grant.expires_at.isoformat(),
            "uses_remaining": grant.uses_remaining,
            "max_uses": grant.max_uses,
            "status": grant.status,
        }


class RiskReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            RiskEvent.Status.REVIEWED_OK,
            RiskEvent.Status.REVIEWED_FRAUD,
            RiskEvent.Status.ESCALATED,
        ]
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")
    allow_swap = serializers.BooleanField(required=False, allow_null=True, default=None)
    ttl_hours = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=48, default=None
    )
    max_uses = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=5, default=None
    )


class FlagRiskEventSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    rule_code = serializers.CharField(required=False, default="MANUAL_FLAG")
    severity = serializers.ChoiceField(
        choices=RiskEvent.Severity.choices, required=False, allow_null=True
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")
