"""Shared seed helpers — verified KYC always includes face + ID card scans."""
from __future__ import annotations

from django.utils import timezone

from accounts.models import Account, Driver, IdentityDocument, User
from core.helpers.crypto import encrypt_text
from core.models import MediaAsset

SEED_FACE = (
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
    "?auto=format&fit=crop&w=640&q=80"
)
SEED_ID_FRONT = (
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f"
    "?auto=format&fit=crop&w=960&q=80"
)
SEED_ID_BACK = (
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f"
    "?auto=format&fit=crop&w=960&q=80"
)

# Alternate portrait for Path B / second demo rider.
SEED_FACE_ALT = (
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
    "?auto=format&fit=crop&w=640&q=80"
)


def seed_media_asset(*, storage_key: str, user: User) -> MediaAsset:
    asset, _ = MediaAsset.objects.get_or_create(
        storage_key=storage_key,
        defaults={
            "provider": MediaAsset.Provider.CLOUDINARY,
            "content_type": "image/jpeg",
            "resource_type": "image",
            "uploaded_by": user,
        },
    )
    return asset


def ensure_verified_identity(
    *,
    account: Account,
    user: User,
    id_number: str = "12345678901",
    doc_type: str = IdentityDocument.DocType.NIN,
    face_url: str = SEED_FACE,
    front_url: str = SEED_ID_FRONT,
    back_url: str = SEED_ID_BACK,
) -> IdentityDocument:
    """Mark account VERIFIED with face + front/back MediaAssets (HTTPS keys)."""
    face = seed_media_asset(storage_key=face_url, user=user)
    front = seed_media_asset(storage_key=front_url, user=user)
    back = seed_media_asset(storage_key=back_url, user=user)

    driver, _ = Driver.objects.get_or_create(
        user=user,
        defaults={"account": account, "status": "ACTIVE", "photo": face},
    )
    if driver.account_id != account.id:
        driver.account = account
    if driver.photo_id != face.id:
        driver.photo = face
    driver.save(update_fields=["account", "photo", "updated_at"])

    number = "".join(ch for ch in id_number if ch.isalnum())
    doc = (
        IdentityDocument.objects.filter(account=account)
        .order_by("-created_at")
        .first()
    )
    if doc is None:
        doc = IdentityDocument(account=account, doc_type=doc_type)
    doc.doc_type = doc_type
    doc.number_encrypted = encrypt_text(number)
    doc.number_last4 = number[-4:]
    doc.front_image = front
    doc.back_image = back
    doc.status = IdentityDocument.Status.VERIFIED
    doc.verified_via = IdentityDocument.VerifiedVia.MANUAL
    doc.verified_at = timezone.now()
    doc.reject_reason = ""
    doc.photos_requested = False
    doc.request_note = ""
    doc.save()

    if account.kyc_status != Account.KycStatus.VERIFIED:
        account.kyc_status = Account.KycStatus.VERIFIED
        account.save(update_fields=["kyc_status", "updated_at"])
    return doc
