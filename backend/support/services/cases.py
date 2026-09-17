from __future__ import annotations

import random

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from core.services.media import resolve_owned_asset
from support.models import CaseEvent, SupportCase
from support.selectors import sla_due_for
from support.services.notify import notify_case_staff, notify_case_rider


def _case_code() -> str:
    return f"CS-{''.join(random.choices('0123456789', k=6))}"


def _resolve_attachment(*, actor, attachment_asset_id):
    if not attachment_asset_id:
        return None
    if actor is None:
        raise DomainError(
            "VALIDATION_ERROR",
            "Actor required to attach media.",
            http=400,
        )
    return resolve_owned_asset(user=actor, asset_id=attachment_asset_id)


def _resolve_payment(*, account, payment_id):
    if not payment_id:
        return None
    from finance.models import Payment

    try:
        payment = Payment.objects.get(pk=payment_id)
    except (Payment.DoesNotExist, ValueError, TypeError) as exc:
        raise DomainError(
            "VALIDATION_ERROR",
            "Unknown payment.",
            details={"payment_id": ["invalid"]},
        ) from exc
    if payment.account_id != account.id:
        raise DomainError(
            "FORBIDDEN",
            "Payment does not belong to this account.",
            http=403,
        )
    return payment


class SupportCaseService:
    @staticmethod
    def open_case(
        *,
        account,
        subject: str,
        kind: str = SupportCase.Kind.GENERAL,
        priority: str = SupportCase.Priority.NORMAL,
        driver=None,
        opened_by=None,
        body: str = "",
        attachment_asset_id=None,
        payment_id=None,
    ) -> SupportCase:
        subject = (subject or "").strip()
        if not subject:
            raise DomainError("VALIDATION_ERROR", "Case subject is required.")
        asset = _resolve_attachment(
            actor=opened_by, attachment_asset_id=attachment_asset_id
        )
        payment = _resolve_payment(account=account, payment_id=payment_id)
        with transaction.atomic():
            case = None
            for _ in range(8):
                try:
                    case = SupportCase.objects.create(
                        code=_case_code(),
                        account=account,
                        driver=driver,
                        kind=kind,
                        priority=priority,
                        subject=subject[:200],
                        opened_by=opened_by,
                        status=SupportCase.Status.OPEN,
                        sla_due_at=sla_due_for(priority),
                        payment=payment,
                    )
                    break
                except Exception:
                    continue
            if case is None:
                raise DomainError("INTEGRATION_ERROR", "Could not allocate case code.")
            text = (body or "").strip()
            if text or asset is not None:
                kind_ev = (
                    CaseEvent.Kind.ATTACHMENT
                    if asset is not None and not text
                    else CaseEvent.Kind.NOTE
                )
                CaseEvent.objects.create(
                    case=case,
                    actor=opened_by,
                    kind=kind_ev,
                    body=(text or (asset.original_filename if asset else ""))[:4000],
                    attachment=asset,
                )
            emit_event(
                action="support_case.opened",
                subject_type="support_case",
                subject_id=str(case.id),
                subject_label=case.code,
                actor=opened_by,
                metadata={
                    "account_id": str(account.id),
                    "kind": kind,
                    "has_attachment": asset is not None,
                    "payment_id": str(payment.id) if payment else None,
                },
            )
            notify_case_staff(
                case=case,
                title=f"New case {case.code}",
                body=f"{account.display_name or account.kura_id}: {case.subject}",
                dedupe_key=f"support.opened:{case.id}",
            )
            return case

    @staticmethod
    def add_note(
        *,
        case: SupportCase,
        actor,
        body: str = "",
        attachment_asset_id=None,
    ) -> CaseEvent:
        asset = _resolve_attachment(actor=actor, attachment_asset_id=attachment_asset_id)
        text = (body or "").strip()
        if not text and asset is None:
            raise DomainError(
                "VALIDATION_ERROR",
                "Note body or attachment is required.",
            )
        kind_ev = (
            CaseEvent.Kind.ATTACHMENT
            if asset is not None and not text
            else CaseEvent.Kind.NOTE
        )
        with transaction.atomic():
            event = CaseEvent.objects.create(
                case=case,
                actor=actor,
                kind=kind_ev,
                body=(text or (asset.original_filename if asset else ""))[:4000],
                attachment=asset,
            )
            emit_event(
                action="support_case.note",
                subject_type="support_case",
                subject_id=str(case.id),
                subject_label=case.code,
                actor=actor,
                metadata={
                    "event_id": str(event.id),
                    "has_attachment": asset is not None,
                },
            )
            owner_id = getattr(case.account, "owner_user_id", None)
            actor_id = getattr(actor, "id", None)
            if owner_id and actor_id and owner_id == actor_id:
                notify_case_staff(
                    case=case,
                    title=f"Update on {case.code}",
                    body=(text or "Photo attached")[:180],
                    dedupe_key=f"support.note:{event.id}",
                )
            else:
                notify_case_rider(
                    case=case,
                    title=f"Update on {case.code}",
                    body=(text or "Photo attached")[:180],
                    dedupe_key=f"support.note:{event.id}",
                )
            return event

    @staticmethod
    def set_status(*, case: SupportCase, status: str, actor=None, note: str = "") -> SupportCase:
        if status not in SupportCase.Status.values:
            raise DomainError("VALIDATION_ERROR", f"Invalid status {status}.")
        with transaction.atomic():
            case = SupportCase.objects.select_for_update().get(pk=case.pk)
            prev = case.status
            case.status = status
            case.save(update_fields=["status", "updated_at"])
            CaseEvent.objects.create(
                case=case,
                actor=actor,
                kind=CaseEvent.Kind.STATUS,
                body=note.strip()[:4000] or f"{prev} → {status}",
            )
            emit_event(
                action="support_case.status",
                subject_type="support_case",
                subject_id=str(case.id),
                subject_label=case.code,
                actor=actor,
                metadata={"from": prev, "to": status},
            )
            notify_case_rider(
                case=case,
                title=f"Case {case.code} updated",
                body=f"Status is now {status.replace('_', ' ').title()}.",
                dedupe_key=f"support.status:{case.id}:{status}",
            )
            return case

    @staticmethod
    def assign(*, case: SupportCase, assignee=None, actor=None) -> SupportCase:
        with transaction.atomic():
            case = SupportCase.objects.select_for_update().get(pk=case.pk)
            case.assigned_to = assignee
            if assignee is not None and case.status == SupportCase.Status.OPEN:
                case.status = SupportCase.Status.PENDING
            case.save(update_fields=["assigned_to", "status", "updated_at"])
            label = (
                getattr(assignee, "email", None)
                or getattr(assignee, "phone", None)
                or (str(assignee.id) if assignee else "Unassigned")
            )
            CaseEvent.objects.create(
                case=case,
                actor=actor,
                kind=CaseEvent.Kind.ASSIGNMENT,
                body=f"Assigned to {label}" if assignee else "Unassigned",
            )
            if assignee is not None:
                emit_event(
                    action="support_case.assigned",
                    subject_type="support_case",
                    subject_id=str(case.id),
                    subject_label=case.code,
                    actor=actor,
                    metadata={"assignee_id": str(assignee.id)},
                    notify=NotifySpec(
                        user=assignee,
                        title=f"Assigned {case.code}",
                        body=case.subject,
                        source="Support",
                        link_path=f"/cases/{case.id}",
                        template_code="support.assigned",
                        dedupe_key=f"support.assigned:{case.id}:{assignee.id}",
                    ),
                )
            return case
