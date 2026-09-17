"""CRM account list vs detail."""
from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from accounts.models import Account
from accounts.permissions import user_has_capability
from core.services.media import delivery_url


def _latest_doc(account: Account):
    cached = getattr(account, "_prefetched_objects_cache", {}).get("identity_documents")
    if cached is not None:
        return cached[0] if cached else None
    return account.identity_documents.order_by("-created_at").first()


def _first_driver(account: Account):
    cached = getattr(account, "_prefetched_objects_cache", {}).get("drivers")
    if cached is not None:
        return cached[0] if cached else None
    return account.drivers.select_related("photo").order_by("created_at").first()


class AccountCrmListSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="owner_user.phone", read_only=True, allow_null=True)
    email = serializers.EmailField(source="owner_user.email", read_only=True, allow_null=True)
    photo_url = serializers.SerializerMethodField()
    id_type = serializers.SerializerMethodField()
    id_last4 = serializers.SerializerMethodField()
    kyc_document_status = serializers.SerializerMethodField()
    verified_via = serializers.SerializerMethodField()
    primary_vehicle_reg = serializers.SerializerMethodField()
    vehicle_count = serializers.SerializerMethodField()
    active_plan_name = serializers.SerializerMethodField()
    wallet_available_kobo = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id",
            "kura_id",
            "kind",
            "display_name",
            "status",
            "kyc_status",
            "psp",
            "registration_channel",
            "phone",
            "email",
            "photo_url",
            "id_type",
            "id_last4",
            "kyc_document_status",
            "verified_via",
            "cooperative_id",
            "cooperative_name",
            "primary_vehicle_reg",
            "vehicle_count",
            "active_plan_name",
            "wallet_available_kobo",
            "created_at",
        ]

    cooperative_id = serializers.UUIDField(
        source="cooperative.id", read_only=True, allow_null=True
    )
    cooperative_name = serializers.CharField(
        source="cooperative.name", read_only=True, allow_null=True
    )

    def get_photo_url(self, obj: Account):
        driver = _first_driver(obj)
        photo = getattr(driver, "photo", None) if driver else None
        return delivery_url(photo)

    def get_id_type(self, obj: Account):
        doc = _latest_doc(obj)
        return doc.doc_type if doc else None

    def get_id_last4(self, obj: Account):
        doc = _latest_doc(obj)
        return doc.number_last4 if doc else None

    def get_kyc_document_status(self, obj: Account):
        doc = _latest_doc(obj)
        return doc.status if doc else None

    def get_verified_via(self, obj: Account):
        doc = _latest_doc(obj)
        return doc.verified_via if doc and doc.verified_via else None

    def get_primary_vehicle_reg(self, obj: Account) -> str | None:
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("vehicles")
        if cached is not None:
            return cached[0].registration_plate if cached else None
        vehicle = obj.vehicles.order_by("created_at").first()
        return vehicle.registration_plate if vehicle else None

    def get_vehicle_count(self, obj: Account) -> int:
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("vehicles")
        if cached is not None:
            return len(cached)
        return obj.vehicles.count()

    def get_active_plan_name(self, obj: Account) -> str | None:
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("subscriptions")
        if cached is not None:
            return cached[0].plan.name if cached else None
        sub = (
            obj.subscriptions.filter(status="ACTIVE")
            .select_related("plan")
            .order_by("-ends_at")
            .first()
        )
        return sub.plan.name if sub else None

    def get_wallet_available_kobo(self, obj: Account) -> int | None:
        return None


class AccountCrmDetailSerializer(AccountCrmListSerializer):
    owner_user_id = serializers.UUIDField(read_only=True)
    driver_ids = serializers.SerializerMethodField()
    wallet_id = serializers.SerializerMethodField()
    vehicle_ids = serializers.SerializerMethodField()

    class Meta(AccountCrmListSerializer.Meta):
        fields = [
            *AccountCrmListSerializer.Meta.fields,
            "owner_user_id",
            "driver_ids",
            "wallet_id",
            "vehicle_ids",
        ]

    def get_driver_ids(self, obj: Account) -> list[str]:
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("drivers")
        if cached is not None:
            return [str(d.id) for d in cached]
        return [str(i) for i in obj.drivers.values_list("id", flat=True)]

    def get_wallet_id(self, obj: Account) -> str | None:
        try:
            return str(obj.wallet.pk)
        except ObjectDoesNotExist:
            return None

    def get_vehicle_ids(self, obj: Account) -> list[str]:
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("vehicles")
        if cached is not None:
            return [str(v.id) for v in cached]
        return [str(i) for i in obj.vehicles.values_list("id", flat=True)]
