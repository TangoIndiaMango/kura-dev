"""Bay velocity throttle status + exception request serializers."""
from rest_framework import serializers


class VelocityStatusQuerySerializer(serializers.Serializer):
    vehicle_id = serializers.UUIDField()


class VelocityExceptionRequestSerializer(serializers.Serializer):
    vehicle_id = serializers.UUIDField()
    note = serializers.CharField(required=True, allow_blank=False, max_length=400)
    hub_id = serializers.UUIDField(required=False, allow_null=True)
    account_id = serializers.UUIDField(required=False, allow_null=True)
