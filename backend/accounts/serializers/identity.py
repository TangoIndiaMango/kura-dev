from rest_framework import serializers


class IdentitySubmitSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=200)
    id_type = serializers.ChoiceField(
        choices=["NIN", "BVN", "VOTER", "DRIVERS_LICENCE", "PASSPORT"],
    )
    # Blank on resubmit = keep the number already on file for this ID type.
    id_number = serializers.CharField(max_length=80, required=False, allow_blank=True)
    face_asset_id = serializers.UUIDField()
    id_front_asset_id = serializers.UUIDField()
    id_back_asset_id = serializers.UUIDField()
    # Required unless SERVICE consent is already on file at the current version.
    consent_service = serializers.BooleanField(required=False, default=False)
    consent_data_sharing = serializers.BooleanField(required=False, default=False)
    channel = serializers.ChoiceField(
        choices=["WEB", "APP", "USSD", "HUB"], required=False, default="WEB"
    )


class IdentityVerifySerializer(serializers.Serializer):
    via = serializers.ChoiceField(
        choices=["PSP", "PROVIDER", "MANUAL"],
        default="MANUAL",
        required=False,
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")


class IdentityRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)


class IdentityRequestPhotosSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=255)


class AccountNotifySerializer(serializers.Serializer):
    message = serializers.CharField(max_length=280)


class IdentityAdjustPhotosSerializer(serializers.Serializer):
    id_front_asset_id = serializers.UUIDField()
    id_back_asset_id = serializers.UUIDField()
    face_asset_id = serializers.UUIDField(required=False, allow_null=True)
