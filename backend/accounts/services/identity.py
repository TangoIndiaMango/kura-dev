"""Identity / KYC write path — MediaAsset ids only (no multipart, no CDN URLs)."""
from __future__ import annotations

from django.db import transaction

from accounts.helpers.kyc import kyc_payload
from accounts.models import Account, Driver, IdentityDocument, User
from accounts.services.identity_review import (
    clear_photo_request_fields,
    reject_identity,
    request_identity_photos,
    verify_identity,
)
from accounts.services.identity_withdraw import withdraw_identity
from core.helpers.crypto import encrypt_text
from core.exceptions import DomainError
from core.services.events import emit_event
from core.services.media import resolve_owned_asset
from finance.models import VirtualAccount
from integrations.services.va import schedule_va_provision


ALLOWED_DOC_TYPES = {c.value for c in IdentityDocument.DocType}


class IdentityService:
    @staticmethod
    def _own_account(user: User) -> Account:
        driver = getattr(user, "driver_profile", None)
        if driver:
            return driver.account
        account = user.accounts.order_by("created_at").first()
        if account is None:
            raise DomainError(
                "ACCOUNT_REQUIRED",
                "Complete profile before submitting ID.",
                http=400,
            )
        return account

    @staticmethod
    def kyc_payload(
        account: Account,
        *,
        driver: Driver | None = None,
        doc: IdentityDocument | None = None,
    ) -> dict:
        return kyc_payload(account, driver=driver, doc=doc)

    @staticmethod
    @transaction.atomic
    def submit(
        *,
        user: User,
        id_type: str,
        id_number: str,
        display_name: str = "",
        face_asset_id=None,
        id_front_asset_id=None,
        id_back_asset_id=None,
        account: Account | None = None,
        asset_owner: User | None = None,
        actor: User | None = None,
    ) -> dict:
        doc_type = (id_type or "").strip().upper()
        number = "".join(ch for ch in (id_number or "") if ch.isalnum())
        name = (display_name or "").strip()
        if not name and account is not None:
            name = account.display_name
        if len(name) < 2:
            raise DomainError(
                "VALIDATION_ERROR",
                "Full name is required.",
                details={"display_name": ["required"]},
            )
        if doc_type not in ALLOWED_DOC_TYPES:
            raise DomainError(
                "VALIDATION_ERROR",
                "Unsupported ID type.",
                details={"id_type": ["invalid"]},
            )

        if account is None:
            from accounts.services.accounts import AccountService

            AccountService.complete_profile(user=user, display_name=name)
            account = IdentityService._own_account(user)
        existing = (
            IdentityDocument.objects.select_for_update()
            .filter(account=account, doc_type=doc_type)
            .order_by("-created_at")
            .first()
        )
        keep_number = not number and existing is not None and bool(existing.number_encrypted)
        if keep_number:
            number = ""  # unused; we copy ciphertext below
        elif len(number) < 8:
            raise DomainError(
                "VALIDATION_ERROR",
                "ID number looks too short.",
                details={"id_number": ["invalid"]},
            )

        owner = asset_owner or user
        face = resolve_owned_asset(user=owner, asset_id=face_asset_id)
        if face is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Face photo is required. Upload via /media/upload/ first.",
                details={"face_asset_id": ["required"]},
            )
        front = resolve_owned_asset(user=owner, asset_id=id_front_asset_id)
        back = resolve_owned_asset(user=owner, asset_id=id_back_asset_id)
        if front is None or back is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Front and back ID card photos are required.",
                details={
                    "id_front_asset_id": ["required"] if front is None else [],
                    "id_back_asset_id": ["required"] if back is None else [],
                },
            )

        driver, _ = Driver.objects.get_or_create(user=user, defaults={"account": account})
        if driver.account_id != account.id:
            driver.account = account

        driver.photo = face
        driver.save(update_fields=["photo", "account", "updated_at"])

        doc = existing
        if doc is None:
            doc = IdentityDocument(account=account, doc_type=doc_type)

        if keep_number and existing is not None:
            doc.number_encrypted = existing.number_encrypted
            doc.number_last4 = existing.number_last4
            last4 = existing.number_last4
        else:
            last4 = number[-4:]
            doc.number_encrypted = encrypt_text(number)
            doc.number_last4 = last4
        doc.doc_type = doc_type
        doc.front_image = front
        doc.back_image = back
        doc.status = IdentityDocument.Status.PENDING
        doc.verified_via = ""
        doc.verified_at = None
        doc.reject_reason = ""
        doc.photos_requested = False
        doc.request_note = ""
        doc.save()

        account.kyc_status = Account.KycStatus.PENDING
        account.save(update_fields=["kyc_status", "updated_at"])

        if user.onboarding_step in {
            User.OnboardingStep.PIN,
            User.OnboardingStep.PROFILE,
        }:
            user.onboarding_step = User.OnboardingStep.DONE
            user.save(update_fields=["onboarding_step", "updated_at"])

        va = VirtualAccount.objects.filter(account=account).first()
        if not (va and va.status == VirtualAccount.Status.ACTIVE and va.nuban):
            schedule_va_provision(
                account.id,
                bvn_or_nin=number if number else None,
            )

        if actor is not None and actor.pk != user.pk:
            emit_event(
                action="kyc.submitted_by_admin",
                subject_type="account",
                subject_id=str(account.id),
                subject_label=account.kura_id or account.display_name,
                actor=actor,
                after={
                    "doc_type": doc_type,
                    "id_last4": last4,
                    "kyc_status": account.kyc_status,
                },
            )

        return IdentityService.kyc_payload(account, driver=driver, doc=doc)

    @staticmethod
    def withdraw(*, user: User) -> dict:
        return withdraw_identity(user=user)

    @staticmethod
    @transaction.atomic
    def adjust_photos(
        *,
        user: User,
        id_front_asset_id,
        id_back_asset_id,
        face_asset_id=None,
    ) -> dict:
        """Re-upload ID (and optional face) while PENDING after ops asked for fixes."""
        account = IdentityService._own_account(user)
        if account.kyc_status not in {
            Account.KycStatus.PENDING,
            Account.KycStatus.VERIFIED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                "Photo updates are only allowed while KYC is pending review.",
                http=400,
            )
        if account.kyc_status == Account.KycStatus.VERIFIED:
            doc_probe = (
                IdentityDocument.objects.filter(account=account)
                .order_by("-created_at")
                .first()
            )
            driver_probe = getattr(user, "driver_profile", None)
            incomplete = (
                doc_probe is None
                or not doc_probe.front_image_id
                or not doc_probe.back_image_id
                or driver_probe is None
                or driver_probe.photo_id is None
            )
            if not incomplete:
                raise DomainError(
                    "INVALID_TRANSITION",
                    "Identity is already complete. Contact support to change ID photos.",
                    http=400,
                )

        front = resolve_owned_asset(user=user, asset_id=id_front_asset_id)
        back = resolve_owned_asset(user=user, asset_id=id_back_asset_id)
        if front is None or back is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Front and back ID card photos are required.",
                details={
                    "id_front_asset_id": ["required"] if front is None else [],
                    "id_back_asset_id": ["required"] if back is None else [],
                },
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
                "Submit identity first, then attach photos.",
                http=400,
            )

        driver = getattr(user, "driver_profile", None)
        face = None
        if face_asset_id is not None:
            face = resolve_owned_asset(user=user, asset_id=face_asset_id)
            if face is None:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "Face photo upload failed.",
                    details={"face_asset_id": ["invalid"]},
                )
            if driver is not None:
                driver.photo = face
                driver.save(update_fields=["photo", "updated_at"])

        before = {
            "photos_requested": doc.photos_requested,
            "front_image_id": str(doc.front_image_id) if doc.front_image_id else None,
            "back_image_id": str(doc.back_image_id) if doc.back_image_id else None,
        }
        doc.front_image = front
        doc.back_image = back
        clear_fields = clear_photo_request_fields(doc)
        doc.save(
            update_fields=[
                "front_image",
                "back_image",
                "updated_at",
                *clear_fields,
            ]
        )
        label = account.kura_id or account.display_name or str(account.id)
        emit_event(
            action="kyc.photos_updated",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=label,
            actor=user,
            before=before,
            after={
                "photos_requested": False,
                "front_image_id": str(front.id),
                "back_image_id": str(back.id),
            },
            metadata={},
            notify=None,
        )
        return IdentityService.kyc_payload(account, driver=driver, doc=doc)

    @staticmethod
    def verify(*, account: Account, actor: User, via: str = "MANUAL", note: str = "") -> dict:
        return verify_identity(account=account, actor=actor, via=via, note=note)

    @staticmethod
    def reject(*, account: Account, actor: User, reason: str) -> dict:
        return reject_identity(account=account, actor=actor, reason=reason)

    @staticmethod
    def request_photos(*, account: Account, actor: User, note: str) -> dict:
        return request_identity_photos(account=account, actor=actor, note=note)
