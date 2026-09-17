"""Price matrix lifecycle verbs — schedule, reject, customer notice."""
from __future__ import annotations

import logging
from datetime import date

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.money import format_naira
from core.services.events import emit_event
from mobility.models import PriceMatrix, Vehicle
from notifications.models import Notification
from notifications.services import NotificationService

logger = logging.getLogger(__name__)


class MatrixLifecycleService:
    @classmethod
    def schedule_matrix(
        cls,
        *,
        matrix: PriceMatrix,
        actor=None,
        effective_from: date | None = None,
        send_customer_notice: bool = False,
    ) -> PriceMatrix:
        """
        PENDING → SCHEDULED. Sets/keeps effective_from (must be today or later).
        Optional customer notice emails/SMS/in-app to operators with that vehicle type.
        """
        if matrix.status != PriceMatrix.Status.PENDING:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot schedule matrix in status {matrix.status}.",
                http=409,
            )
        target = effective_from or matrix.effective_from
        today = timezone.localdate()
        if target < today:
            raise DomainError(
                "VALIDATION_ERROR",
                "Scheduled effective date must be today or later.",
            )
        with transaction.atomic():
            locked = PriceMatrix.objects.select_for_update().get(pk=matrix.pk)
            if locked.status != PriceMatrix.Status.PENDING:
                raise DomainError(
                    "INVALID_TRANSITION",
                    f"Cannot schedule matrix in status {locked.status}.",
                    http=409,
                )
            locked.effective_from = target
            locked.status = PriceMatrix.Status.SCHEDULED
            locked.save(update_fields=["effective_from", "status", "updated_at"])
            matrix = locked

        notice_count = 0
        if send_customer_notice:
            notice_count = cls._dispatch_customer_notice(matrix=matrix)

        emit_event(
            action="price_matrix.scheduled",
            subject_type="price_matrix",
            subject_id=str(matrix.id),
            actor=actor,
            after={
                "vehicle_type": matrix.vehicle_type,
                "status": matrix.status,
                "effective_from": matrix.effective_from.isoformat(),
                "customer_notice_sent": send_customer_notice,
                "customer_notice_count": notice_count,
            },
        )
        return matrix

    @classmethod
    def reject_matrix(
        cls,
        *,
        matrix: PriceMatrix,
        actor=None,
        reason: str = "",
    ) -> PriceMatrix:
        """PENDING | SCHEDULED → REJECTED (internal withdrawal of a proposed tariff)."""
        if matrix.status not in {
            PriceMatrix.Status.PENDING,
            PriceMatrix.Status.SCHEDULED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot reject matrix in status {matrix.status}.",
                http=409,
            )
        with transaction.atomic():
            locked = PriceMatrix.objects.select_for_update().get(pk=matrix.pk)
            if locked.status not in {
                PriceMatrix.Status.PENDING,
                PriceMatrix.Status.SCHEDULED,
            }:
                raise DomainError(
                    "INVALID_TRANSITION",
                    f"Cannot reject matrix in status {locked.status}.",
                    http=409,
                )
            locked.status = PriceMatrix.Status.REJECTED
            locked.save(update_fields=["status", "updated_at"])
            matrix = locked

        emit_event(
            action="price_matrix.rejected",
            subject_type="price_matrix",
            subject_id=str(matrix.id),
            actor=actor,
            after={
                "vehicle_type": matrix.vehicle_type,
                "status": matrix.status,
                "reason": (reason or "")[:500],
            },
        )
        return matrix

    @staticmethod
    def _dispatch_customer_notice(*, matrix: PriceMatrix) -> int:
        """Fan-out tariff customer notice (IN_APP + EMAIL + SMS) to affected operators."""
        owners = (
            Vehicle.objects.filter(
                vehicle_model__vehicle_type=matrix.vehicle_type,
                account__owner_user__isnull=False,
            )
            .select_related("account__owner_user")
            .values_list(
                "account__owner_user_id",
                "account__owner_user__email",
                "account__owner_user__phone",
                "account__owner_user__first_name",
            )
            .distinct()
        )
        title = "Tariff change notice"
        body = (
            f"New {matrix.vehicle_type.lower()} rates take effect "
            f"{matrix.effective_from.isoformat()}: "
            f"PPS {format_naira(matrix.pay_per_swap_kobo)}, "
            f"daily {format_naira(matrix.daily_kobo)}."
        )
        sent = 0
        seen: set = set()
        for user_id, email, phone, first_name in owners:
            if user_id in seen:
                continue
            seen.add(user_id)
            from accounts.models import User

            user = User.objects.filter(pk=user_id).first()
            if user is None:
                continue
            dedupe = f"tariff.notice:{matrix.id}:{user_id}"
            for channel in (
                Notification.Channel.IN_APP,
                Notification.Channel.EMAIL,
                Notification.Channel.SMS,
            ):
                if channel == Notification.Channel.EMAIL and not (email or "").strip():
                    continue
                if channel == Notification.Channel.SMS and not (phone or "").strip():
                    continue
                NotificationService.notify(
                    user=user,
                    title=title,
                    body=body,
                    source="Pricing",
                    severity=Notification.Severity.INFO,
                    channel=channel,
                    template_code="tariff.customer_notice",
                    link_path="/plans",
                    params={
                        "vehicle_type": matrix.vehicle_type,
                        "effective_from": matrix.effective_from.isoformat(),
                        "pay_per_swap_kobo": matrix.pay_per_swap_kobo,
                        "daily_kobo": matrix.daily_kobo,
                        "weekly_kobo": matrix.weekly_kobo,
                        "monthly_kobo": matrix.monthly_kobo,
                        "first_name": first_name or "",
                    },
                    dedupe_key=f"{dedupe}:{channel}",
                )
            if (email or "").strip():
                try:
                    from core.tasks import send_templated_email_task

                    send_templated_email_task.enqueue(
                        to=email.strip(),
                        subject=f"Kura tariff change — effective {matrix.effective_from}",
                        template="email/tariff_customer_notice.html",
                        context={
                            "first_name": first_name or "there",
                            "vehicle_type": matrix.vehicle_type.replace("_", " ").title(),
                            "effective_from": matrix.effective_from.isoformat(),
                            "daily": format_naira(matrix.daily_kobo),
                            "weekly": format_naira(matrix.weekly_kobo),
                            "monthly": format_naira(matrix.monthly_kobo),
                            "pay_per_swap": format_naira(matrix.pay_per_swap_kobo),
                        },
                    )
                except Exception:
                    logger.exception(
                        "tariff_notice_email_failed matrix=%s user=%s",
                        matrix.id,
                        user_id,
                    )
            sent += 1
        return sent
