"""Cash deposit + shift serializers."""
from __future__ import annotations

from rest_framework import serializers

from operations.models import CashDeposit, Shift


class ShiftListSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()
    hub_code = serializers.CharField(source="hub.code", read_only=True)
    hub_name = serializers.CharField(source="hub.name", read_only=True)
    # Live: successful cash taken on this window so far (expected_cash_kobo is
    # only filled at close, so open windows otherwise look empty).
    collected_cash_kobo = serializers.SerializerMethodField()
    # Open longer than a duty day — reconcile and close before it spans weeks.
    is_stale = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = [
            "id",
            "agent_id",
            "agent_name",
            "hub_id",
            "hub_code",
            "hub_name",
            "opened_at",
            "closed_at",
            "opening_cash_kobo",
            "closing_cash_kobo",
            "expected_cash_kobo",
            "variance_kobo",
            "lodge_ref",
            "lodged_amount_kobo",
            "lodged_at",
            "status",
            "created_at",
            "collected_cash_kobo",
            "is_stale",
        ]

    def get_collected_cash_kobo(self, obj: Shift) -> int:
        from operations.services.cash.deposits import CashDepositService

        return CashDepositService.sum_success_kobo(shift=obj)

    def get_is_stale(self, obj: Shift) -> bool:
        from datetime import timedelta

        from django.utils import timezone

        return obj.closed_at is None and obj.opened_at < timezone.now() - timedelta(hours=24)

    def get_agent_name(self, obj: Shift) -> str:
        u = obj.agent
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.email or u.phone or str(u.id)


class ShiftDetailSerializer(ShiftListSerializer):
    deposit_ids = serializers.SerializerMethodField()

    class Meta(ShiftListSerializer.Meta):
        fields = [
            *ShiftListSerializer.Meta.fields,
            "deposit_ids",
            "updated_at",
        ]

    def get_deposit_ids(self, obj: Shift) -> list[str]:
        return [str(i) for i in obj.cash_deposits.values_list("id", flat=True)]


class ShiftOpenSerializer(serializers.Serializer):
    hub_id = serializers.UUIDField()
    opening_cash_kobo = serializers.IntegerField(min_value=0, required=False, default=0)


class ShiftCloseSerializer(serializers.Serializer):
    closing_cash_kobo = serializers.IntegerField(min_value=0)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")


class ShiftLodgeSerializer(serializers.Serializer):
    lodge_ref = serializers.CharField(max_length=100)
    amount_kobo = serializers.IntegerField(min_value=0, required=False)


class CashDepositListSerializer(serializers.ModelSerializer):
    agent_id = serializers.UUIDField(read_only=True)
    hub_id = serializers.UUIDField(read_only=True)
    account_id = serializers.UUIDField(read_only=True)
    shift_id = serializers.UUIDField(read_only=True)
    payment_id = serializers.UUIDField(read_only=True, allow_null=True)
    hub_code = serializers.CharField(source="hub.code", read_only=True)
    account_kura_id = serializers.CharField(
        source="account.kura_id", read_only=True, allow_null=True
    )

    class Meta:
        model = CashDeposit
        fields = [
            "id",
            "receipt_code",
            "amount_kobo",
            "status",
            "purpose",
            "psp_agent_ref",
            "agent_id",
            "hub_id",
            "hub_code",
            "account_id",
            "account_kura_id",
            "shift_id",
            "payment_id",
            "created_at",
        ]


class CashDepositDetailSerializer(CashDepositListSerializer):
    class Meta(CashDepositListSerializer.Meta):
        fields = [*CashDepositListSerializer.Meta.fields, "idempotency_key", "updated_at"]


class CashDepositCreateSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    hub_id = serializers.UUIDField()
    amount_kobo = serializers.IntegerField(min_value=1)
    shift_id = serializers.UUIDField(required=False, allow_null=True)
    psp_agent_ref = serializers.CharField(required=False, allow_blank=True, default="")
    purpose = serializers.ChoiceField(
        choices=["SWAP", "FUND"], required=False, default="SWAP"
    )
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")
