"""KYC read payload for poll endpoints (F1)."""
from __future__ import annotations

from accounts.models import Account, Driver, IdentityDocument
from core.services.media import delivery_url
from finance.models import VirtualAccount


def latest_identity_doc(account: Account) -> IdentityDocument | None:
    return (
        account.identity_documents.select_related("front_image", "back_image")
        .order_by("-created_at")
        .first()
    )


def kyc_payload(
    account: Account,
    *,
    driver: Driver | None = None,
    doc: IdentityDocument | None = None,
) -> dict:
    if driver is None:
        driver = (
            account.drivers.select_related("user", "photo").order_by("created_at").first()
        )
    if doc is None:
        doc = latest_identity_doc(account)

    photo = getattr(driver, "photo", None) if driver else None
    status = account.kyc_status
    if status == Account.KycStatus.PENDING and doc is None:
        status = Account.KycStatus.NONE

    va = None
    try:
        va = account.virtual_account
    except VirtualAccount.DoesNotExist:
        va = None

    photos_requested = bool(doc and doc.photos_requested)
    missing_card_photos = doc is None or not doc.front_image_id or not doc.back_image_id
    missing_face = driver is None or driver.photo_id is None
    verified_incomplete = (
        status == Account.KycStatus.VERIFIED
        and (missing_card_photos or missing_face)
    )

    if status == Account.KycStatus.PENDING and doc is not None and photos_requested:
        next_action = "upload_photos"
    elif verified_incomplete:
        next_action = "upload_photos"
    elif status == Account.KycStatus.PENDING and doc is not None:
        next_action = "wait_for_review"
    elif status == Account.KycStatus.PENDING_PSP:
        next_action = "wait_for_va"
    elif status in {Account.KycStatus.NONE, Account.KycStatus.PROVISIONAL}:
        next_action = "submit"
    elif status == Account.KycStatus.REJECTED:
        next_action = "resubmit"
    else:
        next_action = "none"

    return {
        "status": status,
        "account_status": account.status,
        "id_type": doc.doc_type if doc else None,
        "id_last4": doc.number_last4 if doc else None,
        "document_status": doc.status if doc else None,
        "verified_via": doc.verified_via if doc and doc.verified_via else None,
        "reject_reason": doc.reject_reason if doc and doc.reject_reason else None,
        "request_note": (
            doc.request_note
            if doc and doc.request_note
            else (
                "Face and ID card photos are required to complete verification."
                if verified_incomplete
                else None
            )
        ),
        "photos_requested": photos_requested or verified_incomplete,
        "face_asset_id": str(photo.id) if photo else None,
        "photo_url": delivery_url(photo),
        "id_front_asset_id": (
            str(doc.front_image_id) if doc and doc.front_image_id else None
        ),
        "id_back_asset_id": (
            str(doc.back_image_id) if doc and doc.back_image_id else None
        ),
        "id_front_url": delivery_url(doc.front_image) if doc else None,
        "id_back_url": delivery_url(doc.back_image) if doc else None,
        "virtual_account_status": va.status if va else None,
        "virtual_account_nuban": va.nuban if va else None,
        "next_action": next_action,
    }
