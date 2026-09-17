"""PetrolEngine / Retrofit serializers — list columns; detail IDs; write payloads."""
from __future__ import annotations

from rest_framework import serializers

from core.helpers.media_refs import resolve_media_ref, resolve_media_refs
from mobility.models import DEFAULT_SAFETY_CHECKLIST, PetrolEngine, Retrofit


class PetrolEngineListSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(source="account.id", read_only=True)
    owner_name = serializers.CharField(source="account.display_name", read_only=True)
    owner_kura_id = serializers.CharField(source="account.kura_id", read_only=True)
    storage_hub_code = serializers.CharField(
        source="storage_hub.code", read_only=True, allow_null=True
    )
    storage_hub_name = serializers.CharField(
        source="storage_hub.name", read_only=True, allow_null=True
    )
    vehicle_id = serializers.SerializerMethodField()
    vehicle_reg = serializers.SerializerMethodField()
    retrofit_id = serializers.SerializerMethodField()
    retrofit_status = serializers.SerializerMethodField()
    eboarder_serial = serializers.SerializerMethodField()

    class Meta:
        model = PetrolEngine
        fields = [
            "id",
            "tag",
            "make",
            "model",
            "hp",
            "condition_grade",
            "status",
            "account_id",
            "owner_name",
            "owner_kura_id",
            "storage_hub_code",
            "storage_hub_name",
            "vehicle_id",
            "vehicle_reg",
            "retrofit_id",
            "retrofit_status",
            "eboarder_serial",
            "released_at",
            "created_at",
        ]

    def get_vehicle_id(self, obj: PetrolEngine):
        try:
            return str(obj.vehicle.id)
        except PetrolEngine.vehicle.RelatedObjectDoesNotExist:
            return None

    def get_vehicle_reg(self, obj: PetrolEngine):
        try:
            return obj.vehicle.registration_plate
        except PetrolEngine.vehicle.RelatedObjectDoesNotExist:
            return ""

    def get_retrofit_id(self, obj: PetrolEngine):
        try:
            return str(obj.retrofit.id)
        except PetrolEngine.retrofit.RelatedObjectDoesNotExist:
            return None

    def get_retrofit_status(self, obj: PetrolEngine):
        try:
            return obj.retrofit.status
        except PetrolEngine.retrofit.RelatedObjectDoesNotExist:
            return None

    def get_eboarder_serial(self, obj: PetrolEngine) -> str:
        try:
            return obj.retrofit.eboarder_serial or ""
        except PetrolEngine.retrofit.RelatedObjectDoesNotExist:
            return ""


class PetrolEngineDetailSerializer(PetrolEngineListSerializer):
    storage_hub_id = serializers.UUIDField(
        source="storage_hub.id", read_only=True, allow_null=True
    )
    intake_agent_id = serializers.UUIDField(
        source="intake_agent.id", read_only=True, allow_null=True
    )
    intake_witness_id = serializers.UUIDField(
        source="intake_witness.id", read_only=True, allow_null=True
    )
    release_by_id = serializers.UUIDField(
        source="release_by.id", read_only=True, allow_null=True
    )
    intake_media = serializers.SerializerMethodField()
    intake_signature_media = serializers.SerializerMethodField()
    release_media = serializers.SerializerMethodField()
    release_signature_media = serializers.SerializerMethodField()

    class Meta(PetrolEngineListSerializer.Meta):
        fields = [
            *PetrolEngineListSerializer.Meta.fields,
            "storage_hub_id",
            "intake_photos",
            "intake_media",
            "intake_signature",
            "intake_signature_media",
            "intake_agent_id",
            "intake_witness_id",
            "release_photos",
            "release_media",
            "release_signature",
            "release_signature_media",
            "release_by_id",
            "raw",
            "updated_at",
        ]

    def get_intake_media(self, obj: PetrolEngine) -> list:
        return resolve_media_refs(obj.intake_photos)

    def get_intake_signature_media(self, obj: PetrolEngine) -> dict | None:
        return resolve_media_ref(obj.intake_signature)

    def get_release_media(self, obj: PetrolEngine) -> list:
        return resolve_media_refs(obj.release_photos)

    def get_release_signature_media(self, obj: PetrolEngine) -> dict | None:
        return resolve_media_ref(obj.release_signature)


class EngineReleaseRequestSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class EngineReleaseSerializer(serializers.Serializer):
    photo_asset_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=1,
    )
    signature_asset_id = serializers.CharField(max_length=255)


class RetrofitListSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(source="account.id", read_only=True)
    owner_name = serializers.CharField(source="account.display_name", read_only=True)
    vehicle_id = serializers.UUIDField(source="vehicle.id", read_only=True)
    vehicle_reg = serializers.CharField(
        source="vehicle.registration_plate", read_only=True
    )
    petrol_engine_id = serializers.UUIDField(
        source="petrol_engine.id", read_only=True, allow_null=True
    )
    petrol_engine_tag = serializers.CharField(
        source="petrol_engine.tag", read_only=True, allow_null=True
    )
    petrol_engine_status = serializers.CharField(
        source="petrol_engine.status", read_only=True, allow_null=True
    )
    petrol_make = serializers.CharField(
        source="petrol_engine.make", read_only=True, allow_null=True
    )
    petrol_model = serializers.CharField(
        source="petrol_engine.model", read_only=True, allow_null=True
    )
    petrol_hp = serializers.CharField(
        source="petrol_engine.hp", read_only=True, allow_null=True
    )
    storage_hub_code = serializers.CharField(
        source="petrol_engine.storage_hub.code", read_only=True, allow_null=True
    )
    storage_hub_name = serializers.CharField(
        source="petrol_engine.storage_hub.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Retrofit
        fields = [
            "id",
            "status",
            "eboarder_serial",
            "account_id",
            "owner_name",
            "vehicle_id",
            "vehicle_reg",
            "petrol_engine_id",
            "petrol_engine_tag",
            "petrol_engine_status",
            "petrol_make",
            "petrol_model",
            "petrol_hp",
            "storage_hub_code",
            "storage_hub_name",
            "activated_at",
            "created_at",
        ]


class RetrofitDetailSerializer(RetrofitListSerializer):
    agent_id = serializers.UUIDField(
        source="agent.id", read_only=True, allow_null=True
    )
    install_media = serializers.SerializerMethodField()

    class Meta(RetrofitListSerializer.Meta):
        fields = [
            *RetrofitListSerializer.Meta.fields,
            "checklist",
            "photos",
            "install_media",
            "agent_id",
            "raw",
            "updated_at",
        ]

    def get_install_media(self, obj: Retrofit) -> list:
        return resolve_media_refs(obj.photos)


class RetrofitCreateSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    vehicle_id = serializers.UUIDField()
    eboarder_serial = serializers.CharField(
        required=False, allow_blank=True, max_length=64
    )
    raw = serializers.DictField(required=False)


class EngineIntakeSerializer(serializers.Serializer):
    tag = serializers.CharField(max_length=40)
    make = serializers.CharField(required=False, allow_blank=True, max_length=80)
    model = serializers.CharField(required=False, allow_blank=True, max_length=80)
    hp = serializers.CharField(required=False, allow_blank=True, max_length=20)
    condition_grade = serializers.ChoiceField(
        choices=PetrolEngine.ConditionGrade.choices, required=False
    )
    witness_user_id = serializers.UUIDField()
    photo_asset_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=1,
    )
    signature_asset_id = serializers.CharField(max_length=255)
    storage_hub_id = serializers.UUIDField(required=False, allow_null=True)
    raw = serializers.DictField(required=False)


class RetrofitInstallSerializer(serializers.Serializer):
    eboarder_id = serializers.UUIDField(required=False)
    eboarder_serial = serializers.CharField(
        max_length=64, required=False, allow_blank=True
    )
    photo_asset_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
    )

    def validate(self, attrs: dict) -> dict:
        if not attrs.get("eboarder_id") and not (attrs.get("eboarder_serial") or "").strip():
            raise serializers.ValidationError(
                "eboarder_id or eboarder_serial is required."
            )
        return attrs


class RetrofitChecklistSerializer(serializers.Serializer):
    checklist = serializers.DictField(child=serializers.BooleanField())
    failure_reason = serializers.CharField(
        required=False, allow_blank=True, max_length=400
    )

    def validate_checklist(self, value: dict) -> dict:
        unknown = set(value.keys()) - set(DEFAULT_SAFETY_CHECKLIST)
        if unknown:
            raise serializers.ValidationError(
                f"Unknown checklist keys: {sorted(unknown)}"
            )
        return value
