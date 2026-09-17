"""KYC ops review — verify / reject / request photo adjustments."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.helpers.kyc import kyc_payload
from accounts.models import Account, IdentityDocument, User
from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event


ALLOWED_VERIFY_VIA = {c.value for c in IdentityDocument.VerifiedVia}


def _clear_photo_request(doc: IdentityDocument) -> list[str]:
    if not doc.photos_requested and not doc.request_note:
        return []
    doc.photos_requested = False
    doc.request_note = ""
    return ["photos_requested", "request_note"]


def _notify_owner(
    *,
    account: Account,
    actor: User,
    action: str,
    title: str,
    body: str,
    template_code: str,
    before: dict,
    after: dict,
    metadata: dict,
    dedupe_key: str,
    link_path: str | None = None,
) -> None:
    owner = account.owner_user
    label = account.kura_id or account.display_name or str(account.id)
    emit_event(
        action=action,
        subject_type="account",
        subject_id=str(account.id),
        subject_label=label,
        actor=actor,
        before=before,
        after=after,
        metadata=metadata,
        notify=NotifySpec(
            user=owner,
            title=title,
            body=body,
            source="Users",
            link_path=link_path or "/account",
            template_code=template_code,
            dedupe_key=dedupe_key,
        )
        if owner is not None
        else None,
    )


@transaction.atomic
def verify_identity(
    *,
    account: Account,
    actor: User,
    via: str = IdentityDocument.VerifiedVia.MANUAL,
    note: str = "",
) -> dict:
    via = (via or IdentityDocument.VerifiedVia.MANUAL).strip().upper()
    if via not in ALLOWED_VERIFY_VIA:
        raise DomainError(
            "VALIDATION_ERROR",
            "Invalid verification channel.",
            details={"via": ["invalid"]},
        )

    doc = (
        IdentityDocument.objects.select_for_update()
        .filter(account=account)
        .order_by("-created_at")
        .first()
    )
    if doc is None:
        raise DomainError(
            "KYC_REQUIRED",
            "Operator has not submitted an identity document yet.",
            http=400,
        )
    if not doc.front_image_id or not doc.back_image_id:
        raise DomainError(
            "KYC_PHOTOS_REQUIRED",
            "Front and back ID card photos are required before verification.",
            http=400,
        )
    driver = account.drivers.select_related("photo").order_by("created_at").first()
    if driver is None or driver.photo_id is None:
        raise DomainError(
            "KYC_PHOTOS_REQUIRED",
            "A face photo is required before verification.",
            http=400,
        )
    if (
        doc.status == IdentityDocument.Status.VERIFIED
        and account.kyc_status == Account.KycStatus.VERIFIED
    ):
        return kyc_payload(account, doc=doc)

    before = {"kyc_status": account.kyc_status, "doc_status": doc.status}
    doc.status = IdentityDocument.Status.VERIFIED
    doc.verified_via = via
    doc.verified_at = timezone.now()
    doc.reject_reason = ""
    fields = [
        "status",
        "verified_via",
        "verified_at",
        "reject_reason",
        "updated_at",
        *_clear_photo_request(doc),
    ]
    doc.save(update_fields=fields)
    account.kyc_status = Account.KycStatus.VERIFIED
    account.save(update_fields=["kyc_status", "updated_at"])
    label = account.kura_id or account.display_name or str(account.id)
    _notify_owner(
        account=account,
        actor=actor,
        action="kyc.verified",
        title="Identity verified",
        body=f"Your KURA identity ({label}) is verified. Full funding and credit unlock when risk allows.",
        template_code="kyc.verified",
        before=before,
        after={"kyc_status": account.kyc_status, "doc_status": doc.status},
        metadata={"via": via, "note": (note or "")[:200]},
        dedupe_key=f"kyc.verified:{account.id}",
        link_path="/account/identity",
    )
    return kyc_payload(account, doc=doc)


@transaction.atomic
def reject_identity(*, account: Account, actor: User, reason: str) -> dict:
    reason = (reason or "").strip()
    if len(reason) < 3:
        raise DomainError(
            "VALIDATION_ERROR",
            "Rejection reason is required.",
            details={"reason": ["required"]},
        )

    doc = (
        IdentityDocument.objects.select_for_update()
        .filter(account=account)
        .order_by("-created_at")
        .first()
    )
    if doc is None:
        raise DomainError(
            "KYC_REQUIRED",
            "Operator has not submitted an identity document yet.",
            http=400,
        )

    before = {"kyc_status": account.kyc_status, "doc_status": doc.status}
    doc.status = IdentityDocument.Status.REJECTED
    doc.verified_via = ""
    doc.verified_at = None
    doc.reject_reason = reason[:255]
    fields = [
        "status",
        "verified_via",
        "verified_at",
        "reject_reason",
        "updated_at",
        *_clear_photo_request(doc),
    ]
    doc.save(update_fields=fields)
    account.kyc_status = Account.KycStatus.REJECTED
    account.save(update_fields=["kyc_status", "updated_at"])
    _notify_owner(
        account=account,
        actor=actor,
        action="kyc.rejected",
        title="Identity needs a resubmit",
        body=reason[:160],
        template_code="kyc.rejected",
        before=before,
        after={"kyc_status": account.kyc_status, "doc_status": doc.status},
        metadata={"reason": reason},
        dedupe_key=f"kyc.rejected:{account.id}:{int(timezone.now().timestamp())}",
        link_path="/account/identity",
    )
    return kyc_payload(account, doc=doc)


@transaction.atomic
def request_identity_photos(
    *,
    account: Account,
    actor: User,
    note: str,
) -> dict:
    note = (note or "").strip()
    if len(note) < 3:
        raise DomainError(
            "VALIDATION_ERROR",
            "Tell the operator what to fix (e.g. blurry ID front).",
            details={"note": ["required"]},
        )
    if account.kyc_status != Account.KycStatus.PENDING:
        raise DomainError(
            "INVALID_TRANSITION",
            "Photo adjustments can only be requested while KYC is pending review.",
            http=400,
        )

    doc = (
        IdentityDocument.objects.select_for_update()
        .filter(account=account)
        .order_by("-created_at")
        .first()
    )
    if doc is None:
        raise DomainError(
            "KYC_REQUIRED",
            "Operator has not submitted an identity document yet.",
            http=400,
        )

    before = {
        "kyc_status": account.kyc_status,
        "photos_requested": doc.photos_requested,
        "request_note": doc.request_note,
    }
    doc.photos_requested = True
    doc.request_note = note[:255]
    doc.save(update_fields=["photos_requested", "request_note", "updated_at"])
    _notify_owner(
        account=account,
        actor=actor,
        action="kyc.photos_requested",
        title="Update your ID photos",
        body=note[:160],
        template_code="kyc.photos_requested",
        before=before,
        after={
            "kyc_status": account.kyc_status,
            "photos_requested": True,
            "request_note": doc.request_note,
        },
        metadata={"note": note[:200]},
        dedupe_key=(
            f"kyc.photos_requested:{account.id}:{int(timezone.now().timestamp())}"
        ),
        link_path="/account/identity",
    )
    return kyc_payload(account, doc=doc)


def clear_photo_request_fields(doc: IdentityDocument) -> list[str]:
    return _clear_photo_request(doc)


__all__ = [
    "verify_identity",
    "reject_identity",
    "request_identity_photos",
    "clear_photo_request_fields",
]
