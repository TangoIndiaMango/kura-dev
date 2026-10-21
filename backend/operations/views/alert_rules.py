"""Alert rule CRUD — persisted config for ops (queue is still Alert instances)."""
from __future__ import annotations

from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from core.services.events import emit_event
from operations.models import AlertRule


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = [
            "id",
            "name",
            "kind",
            "severity",
            "threshold",
            "channels",
            "cooldown_minutes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AlertRuleWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    kind = serializers.ChoiceField(choices=AlertRule._meta.get_field("kind").choices)
    severity = serializers.ChoiceField(
        choices=AlertRule.Severity.choices, required=False
    )
    threshold = serializers.DictField(required=False)
    channels = serializers.ListField(
        child=serializers.CharField(max_length=40), required=False
    )
    cooldown_minutes = serializers.IntegerField(required=False, min_value=1)
    status = serializers.ChoiceField(
        choices=AlertRule.Status.choices, required=False
    )


class AlertRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "alerts:read",
        "retrieve": "alerts:read",
        "create": "alerts:manage",
        "partial_update": "alerts:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AlertRule.objects.none()
        return AlertRule.objects.all()

    def get_serializer_class(self):
        if self.action in {"create", "partial_update"}:
            return AlertRuleWriteSerializer
        return AlertRuleSerializer

    def create(self, request, *args, **kwargs):
        ser = AlertRuleWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        row = AlertRule.objects.create(
            name=data["name"].strip(),
            kind=data["kind"],
            severity=data.get("severity") or AlertRule.Severity.WARNING,
            threshold=data.get("threshold") or {},
            channels=data.get("channels") or ["IN_APP"],
            cooldown_minutes=data.get("cooldown_minutes") or 30,
            status=data.get("status") or AlertRule.Status.ACTIVE,
            created_by=request.user,
        )
        emit_event(
            action="alert_rule.created",
            subject_type="alert_rule",
            subject_id=str(row.id),
            subject_label=row.name,
            actor=request.user,
            after={"kind": row.kind, "status": row.status},
        )
        return created(AlertRuleSerializer(row).data)

    def partial_update(self, request, *args, **kwargs):
        row = self.get_object()
        ser = AlertRuleWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        before = {"status": row.status, "severity": row.severity}
        for key in (
            "name",
            "kind",
            "severity",
            "threshold",
            "channels",
            "cooldown_minutes",
            "status",
        ):
            if key in data:
                setattr(row, key, data[key] if key != "name" else data[key].strip())
        row.save()
        emit_event(
            action="alert_rule.updated",
            subject_type="alert_rule",
            subject_id=str(row.id),
            subject_label=row.name,
            actor=request.user,
            before=before,
            after={"status": row.status, "severity": row.severity},
        )
        return ok(AlertRuleSerializer(row).data)
