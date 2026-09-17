"""Rider withdraw of a non-verified identity pack."""
from __future__ import annotations

from django.db import transaction

from accounts.helpers.kyc import kyc_payload
from accounts.models import Account, Driver, IdentityDocument, User
from core.exceptions import DomainError
from core.services.events import emit_event


@transaction.atomic
def withdraw_identity(*, user: User) -> dict:
    driver = getattr(user, "driver_profile", None)
    account = driver.account if driver else user.accounts.order_by("created_at").first()
    if account is None:
        raise DomainError(
            "ACCOUNT_REQUIRED",
            "Complete profile before withdrawing ID.",
            http=400,
        )
    account = Account.objects.select_for_update().get(pk=account.pk)
    if account.kyc_status == Account.KycStatus.VERIFIED:
        raise DomainError(
            "INVALID_TRANSITION",
            "Verified identity cannot be withdrawn. Contact support if you need a change.",
            http=400,
        )
    before = {"kyc_status": account.kyc_status}
    docs_count = IdentityDocument.objects.filter(account=account).count()
    IdentityDocument.objects.filter(account=account).delete()
    rider = Driver.objects.filter(user=user, account=account).first()
    if rider is not None and rider.photo_id is not None:
        rider.photo = None
        rider.save(update_fields=["photo", "updated_at"])
    account.kyc_status = Account.KycStatus.NONE
    account.save(update_fields=["kyc_status", "updated_at"])
    label = account.kura_id or account.display_name or str(account.id)
    emit_event(
        action="kyc.withdrawn",
        subject_type="account",
        subject_id=str(account.id),
        subject_label=label,
        actor=user,
        before=before,
        after={"kyc_status": account.kyc_status, "docs_removed": docs_count},
        metadata={},
        notify=None,
    )
    return kyc_payload(account, driver=rider, doc=None)
