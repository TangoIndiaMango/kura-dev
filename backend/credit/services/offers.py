"""Product offers catalogue + assignments."""
from __future__ import annotations

from django.db import transaction

from accounts.models import Account
from accounts.services.auth import assert_pin_grant
from core.exceptions import DomainError
from core.services.config import ConfigService
from core.services.events import NotifySpec, emit_event
from credit.models import OfferAssignment, ProductOffer
from notifications.models import Notification


class OfferService:
    @classmethod
    def create_offer(
        cls,
        *,
        name: str,
        offer_type: str,
        summary: str = "",
        terms: dict | None = None,
        segment_criteria: dict | None = None,
        status: str = ProductOffer.Status.DRAFT,
        actor=None,
    ) -> ProductOffer:
        ConfigService.require_enabled("offers")
        offer = ProductOffer.objects.create(
            name=name,
            offer_type=offer_type,
            summary=summary or "",
            terms=terms or {},
            segment_criteria=segment_criteria or {},
            status=status,
        )
        emit_event(
            action="offer.created",
            subject_type="product_offer",
            subject_id=str(offer.id),
            actor=actor,
            after={"name": name, "offer_type": offer_type, "status": status},
        )
        return offer

    @classmethod
    def update_offer(cls, *, offer: ProductOffer, actor=None, **fields) -> ProductOffer:
        ConfigService.require_enabled("offers")
        before = {"status": offer.status, "name": offer.name}
        for key, val in fields.items():
            if val is not None and hasattr(offer, key):
                setattr(offer, key, val)
        offer.save()
        emit_event(
            action="offer.updated",
            subject_type="product_offer",
            subject_id=str(offer.id),
            actor=actor,
            before=before,
            after={"status": offer.status, "name": offer.name},
        )
        return offer

    @classmethod
    def assign(
        cls,
        *,
        offer: ProductOffer,
        account_ids: list | None = None,
        segment_criteria: dict | None = None,
        channel: str = OfferAssignment.Channel.APP,
        actor=None,
    ) -> list[OfferAssignment]:
        ConfigService.require_enabled("offers")
        if offer.status != ProductOffer.Status.ACTIVE:
            raise DomainError(
                "OFFER_NOT_ACTIVE",
                "Only ACTIVE offers can be assigned.",
                http=409,
            )
        ids = list(account_ids or [])
        if not ids:
            from credit.services.segments import resolve_account_ids_for_segment

            criteria = segment_criteria or offer.segment_criteria or {}
            ids = resolve_account_ids_for_segment(segment_criteria=criteria)
        created: list[OfferAssignment] = []
        with transaction.atomic():
            for account_id in ids:
                account = Account.objects.get(pk=account_id)
                # get_or_create: catching IntegrityError inside this atomic block
                # left the transaction broken (re-assigning returned a 500).
                row, _ = OfferAssignment.objects.get_or_create(
                    account=account,
                    offer=offer,
                    defaults={
                        "status": OfferAssignment.Status.OFFERED,
                        "channel": channel,
                    },
                )
                created.append(row)
                emit_event(
                    action="offer.assigned",
                    subject_type="offer_assignment",
                    subject_id=str(row.id),
                    actor=actor,
                    after={"offer_id": str(offer.id), "account_id": str(account.id)},
                    notify=NotifySpec(
                        user=account.owner_user,
                        title="New offer available",
                        body=offer.name,
                        severity=Notification.Severity.INFO,
                        dedupe_key=f"offer.assign:{row.id}",
                    ),
                )
        return created

    @classmethod
    def accept(
        cls,
        *,
        assignment: OfferAssignment,
        pin_grant: str,
        actor,
        amount_kobo: int | None = None,
    ) -> OfferAssignment:
        ConfigService.require_enabled("offers")
        assert_pin_grant(token=pin_grant, user_id=actor.id)
        if assignment.status != OfferAssignment.Status.OFFERED:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot accept assignment in {assignment.status}.",
                http=409,
            )
        assignment.status = OfferAssignment.Status.ACCEPTED
        if amount_kobo is not None:
            assignment.amount_kobo = amount_kobo
        assignment.save(update_fields=["status", "amount_kobo", "updated_at"])
        emit_event(
            action="offer.accepted",
            subject_type="offer_assignment",
            subject_id=str(assignment.id),
            actor=actor,
            after={"status": assignment.status, "amount_kobo": assignment.amount_kobo},
        )
        return assignment
