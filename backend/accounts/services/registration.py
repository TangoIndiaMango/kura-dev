"""Admin on-behalf operator registration — user + account + wallet + invite."""
from __future__ import annotations

from django.db import transaction

from accounts.helpers.phones import normalize_ng_phone
from accounts.models import Account, Cooperative, Driver, User
from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from finance.services import WalletService
from integrations.services.va import schedule_va_provision


@transaction.atomic
def register_operator(
    *,
    actor: User,
    full_name: str,
    phone: str,
    email: str,
    id_type: str = "",
    id_number: str = "",
    cooperative_id: str | None = None,
    base_url: str | None = None,
) -> tuple[Account, dict]:
    from accounts.services.invites import (
        INVITE_TTL,
        enqueue_staff_invite_email,
        issue_password_setup_token,
    )

    display_name = (full_name or "").strip()
    if not display_name:
        raise DomainError(
            "VALIDATION_ERROR",
            "Full name is required.",
            details={"full_name": ["required"]},
        )
    email = (email or "").strip().lower()
    if not email:
        raise DomainError(
            "VALIDATION_ERROR",
            "Email is required — the password-setup invite is sent there.",
            details={"email": ["required"]},
        )
    if User.objects.filter(email__iexact=email).exists():
        raise DomainError(
            "VALIDATION_ERROR",
            "A user with this email already exists — open their operator page instead.",
            details={"email": ["unique"]},
            http=409,
        )
    e164 = normalize_ng_phone(phone)
    if User.objects.filter(phone=e164).exists():
        raise DomainError(
            "VALIDATION_ERROR",
            "This phone already belongs to a registered user — open their operator page instead.",
            details={"phone": ["unique"]},
            http=409,
        )

    coop = None
    if cooperative_id:
        coop = Cooperative.objects.filter(pk=cooperative_id).first()
        if coop is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Unknown cooperative.",
                details={"cooperative_id": ["invalid"]},
            )

    parts = display_name.split(None, 1)
    user = User.objects.create(
        email=email,
        phone=e164,
        first_name=parts[0],
        last_name=parts[1] if len(parts) > 1 else "",
        role=User.Role.DRIVER,
        is_active=True,
        onboarding_step=User.OnboardingStep.DONE,
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])

    account = Account.objects.create(
        owner_user=user,
        kind=Account.Kind.INDIVIDUAL,
        display_name=display_name,
        kyc_status=Account.KycStatus.PENDING_PSP,
        status=Account.Status.ACTIVE,
        registration_channel=Account.RegistrationChannel.WEB,
        cooperative=coop,
    )
    Driver.objects.get_or_create(user=user, defaults={"account": account})
    WalletService.get_or_create_wallet(account)
    WalletService.ensure_pending_virtual_account(account)

    nin = "".join(ch for ch in (id_number or "") if ch.isalnum()) or None
    schedule_va_provision(account.id, bvn_or_nin=nin)

    _row, raw_token = issue_password_setup_token(user=user)
    enqueue_staff_invite_email(
        user_id=str(user.id), raw_token=raw_token, base_url=base_url
    )
    expires_hours = int(INVITE_TTL.total_seconds() // 3600)

    emit_event(
        action="account.registered",
        subject_type="account",
        subject_id=str(account.id),
        subject_label=account.kura_id or display_name,
        actor=actor,
        after={
            "kura_id": account.kura_id,
            "display_name": display_name,
            "email": email,
            "phone": e164,
            "id_type": (id_type or "").strip().upper(),
            "invite_email_sent": True,
            "cooperative_id": str(coop.id) if coop else None,
        },
        notify=NotifySpec(
            user=actor,
            title="Operator registered",
            body=(
                f"{display_name} ({account.kura_id}) registered. "
                f"Password-setup invite emailed — expires in {expires_hours}h."
            ),
            source="Operators",
            link_path=f"/operators/{account.id}",
            template_code="account.registered",
            dedupe_key=f"account.registered:{account.id}",
        ),
    )
    return account, {
        "invite_email_sent": True,
        "expires_hours": expires_hours,
    }
