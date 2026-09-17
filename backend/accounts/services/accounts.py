"""Account write operations — views call these; serializers stay dumb."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account, Driver, User
from core.exceptions import DomainError
from core.ids import kura_id
from core.services.events import NotifySpec, emit_event
from finance.services import WalletService
from integrations.services.va import schedule_va_provision


class AccountService:
    @staticmethod
    @transaction.atomic
    def complete_profile(
        *,
        user: User,
        display_name: str,
        first_name: str = "",
        last_name: str = "",
        id_type: str = "",
        id_number: str = "",
    ) -> Account:
        display_name = (display_name or "").strip()
        if not display_name:
            raise DomainError(
                "VALIDATION_ERROR",
                "Display name is required.",
                details={"display_name": ["required"]},
            )

        parts = display_name.split(None, 1)
        user.first_name = (first_name or parts[0]).strip()
        user.last_name = (last_name or (parts[1] if len(parts) > 1 else "")).strip()
        user_updates = ["first_name", "last_name", "updated_at"]
        if user.onboarding_step in {
            User.OnboardingStep.PIN,
            User.OnboardingStep.PROFILE,
        }:
            user.onboarding_step = User.OnboardingStep.DONE
            user_updates.append("onboarding_step")
        user.save(update_fields=user_updates)

        account = user.accounts.select_for_update().order_by("created_at").first()
        created = account is None
        previous_name = account.display_name if account is not None else ""
        if created:
            account = Account.objects.create(
                owner_user=user,
                kind=Account.Kind.INDIVIDUAL,
                display_name=display_name,
                kyc_status=Account.KycStatus.PENDING_PSP,
                status=Account.Status.ACTIVE,
            )
            Driver.objects.get_or_create(user=user, defaults={"account": account})
        else:
            account.display_name = display_name
            account.save(update_fields=["display_name", "updated_at"])

        WalletService.get_or_create_wallet(account)
        WalletService.ensure_pending_virtual_account(account)

        nin = "".join(ch for ch in (id_number or "") if ch.isalnum()) or None
        _ = id_type
        if created:
            schedule_va_provision(account.id, bvn_or_nin=nin)

        emit_event(
            action="account.profile_completed" if created else "account.profile_updated",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=account.kura_id or account.display_name,
            actor=user,
            before=None if created else {"display_name": previous_name},
            after={
                "display_name": account.display_name,
                "onboarding_step": user.onboarding_step,
            },
        )
        return account

    @staticmethod
    @transaction.atomic
    def notify_rider(
        *,
        account: Account,
        actor: User,
        message: str,
    ) -> Account:
        """In-app note to the account owner (no SMS). Opens Identity from notifications."""
        from django.utils import timezone

        text = (message or "").strip()
        if len(text) < 3:
            raise DomainError(
                "VALIDATION_ERROR",
                "Write a short note the operator can act on.",
                details={"message": ["required"]},
            )
        owner = account.owner_user
        if owner is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "This account has no owner to notify.",
                http=400,
            )
        label = account.kura_id or account.display_name or str(account.id)
        emit_event(
            action="account.ops_note",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=label,
            actor=actor,
            before={},
            after={},
            metadata={"message": text[:280]},
            notify=NotifySpec(
                user=owner,
                title="Note from Kura ops",
                body=text[:160],
                source="Users",
                link_path="/account/identity",
                template_code="account.ops_note",
                dedupe_key=(
                    f"account.ops_note:{account.id}:{int(timezone.now().timestamp())}"
                ),
            ),
        )
        return account

    @staticmethod
    def ensure_kura_id(account: Account) -> Account:
        if not account.kura_id:
            account.kura_id = kura_id("KR", 6)
            account.save(update_fields=["kura_id", "updated_at"])
        return account

    @staticmethod
    @transaction.atomic
    def suspend(*, account: Account, actor: User, reason: str) -> Account:
        reason = (reason or "").strip()
        if len(reason) < 3:
            raise DomainError(
                "VALIDATION_ERROR",
                "Suspension reason is required.",
                details={"reason": ["required"]},
            )
        if account.status == Account.Status.DEREGISTERED:
            raise DomainError(
                "INVALID_TRANSITION",
                "Deregistered accounts cannot be suspended.",
                http=409,
            )
        before = {"status": account.status}
        account.status = Account.Status.SUSPENDED
        account.save(update_fields=["status", "updated_at"])
        label = account.kura_id or account.display_name or str(account.id)
        emit_event(
            action="account.suspended",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=label,
            actor=actor,
            before=before,
            after={"status": account.status},
            metadata={"reason": reason},
            notify=NotifySpec(
                user=actor,
                title="Operator suspended",
                body=f"{label} suspended: {reason[:120]}",
                source="Users",
                link_path=f"/operators/{account.id}",
                template_code="account.suspended",
                dedupe_key=f"account.suspended:{account.id}",
            ),
        )
        return account

    @staticmethod
    @transaction.atomic
    def reinstate(*, account: Account, actor: User) -> Account:
        if account.status == Account.Status.DEREGISTERED:
            raise DomainError(
                "INVALID_TRANSITION",
                "Deregistered accounts cannot be reinstated.",
                http=409,
            )
        before = {"status": account.status}
        account.status = Account.Status.ACTIVE
        account.save(update_fields=["status", "updated_at"])
        label = account.kura_id or account.display_name or str(account.id)
        emit_event(
            action="account.reinstated",
            subject_type="account",
            subject_id=str(account.id),
            subject_label=label,
            actor=actor,
            before=before,
            after={"status": account.status},
            notify=NotifySpec(
                user=actor,
                title="Operator reinstated",
                body=f"{label} is active again.",
                source="Users",
                link_path=f"/operators/{account.id}",
                template_code="account.reinstated",
                dedupe_key=f"account.reinstated:{account.id}",
            ),
        )
        return account
