from rest_framework import serializers

from audit.models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    at = serializers.DateTimeField(source="created_at", read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "at",
            "action",
            "actor_email",
            "actor_name",
            "actor_role",
            "subject_type",
            "subject_id",
            "subject_label",
            "before",
            "after",
            "metadata",
            "ip_address",
            "request_id",
        ]
        read_only_fields = fields

    def get_actor_name(self, obj) -> str:
        if obj.actor_id:
            name = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
            if name:
                return name
        return obj.actor_email or "system"
