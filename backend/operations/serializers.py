from rest_framework import serializers
from .models import Shift, Override, Alert

class ShiftSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.first_name', read_only=True)
    hub_code = serializers.CharField(source='hub.code', read_only=True)
    hub_name = serializers.CharField(source='hub.name', read_only=True)

    class Meta:
        model = Shift
        fields = '__all__'

class OverrideSerializer(serializers.ModelSerializer):
    agent_email = serializers.CharField(source='agent.email', read_only=True)

    class Meta:
        model = Override
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    hub_name = serializers.CharField(source='hub.name', read_only=True)
    hub_code = serializers.CharField(source='hub.code', read_only=True)

    class Meta:
        model = Alert
        fields = '__all__'
