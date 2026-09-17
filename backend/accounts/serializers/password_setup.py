"""Staff password setup payload serializers."""
from __future__ import annotations

from rest_framework import serializers


class PasswordSetupContextSerializer(serializers.Serializer):
    token = serializers.CharField()


class PasswordSetupSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    password_confirmation = serializers.CharField(write_only=True)
