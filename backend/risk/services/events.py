from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from risk.models import RiskEvent, RiskRule

# PRD 07 — initial rule catalogue (params tunable later in admin).
DEFAULT_RULES: list[dict] = [
    {"code": "BATTERY_MISMATCH", "name": "Returned battery mismatch", "severity": "HIGH", "action": "FLAG"},
    {
        "code": "SWAP_VELOCITY",
        "name": "Swap velocity exceeded",
        "severity": "HIGH",
        "action": "BLOCK",
        "params": {
            "MAX_SWAPS_PER_VEHICLE_DAY": 4,
            "MIN_MINUTES_BETWEEN_SWAPS": 45,
            "GRANT_TTL_HOURS": 4,
            "GRANT_MAX_USES": 1,
        },
    },
    {
        "code": "GEO_IMPOSSIBLE",
        "name": "Geo-impossible travel",
        "severity": "HIGH",
        "action": "FLAG",
        "params": {"MAX_SPEED_KMH": 80, "MAX_SPEED_KMH_BOAT": 40},
    },
    {"code": "OVERRIDE_CASH_CORR", "name": "Override vs cash variance", "severity": "HIGH", "action": "FLAG"},
    {"code": "NEW_DEVICE", "name": "New trusted device", "severity": "MEDIUM", "action": "STEP_UP"},
    {"code": "PHONE_CHANGE", "name": "Phone change", "severity": "MEDIUM", "action": "FREEZE"},
    {"code": "PIN_BRUTE", "name": "PIN brute force", "severity": "HIGH", "action": "STEP_UP"},
    {"code": "AGENT_REG_VELOCITY", "name": "Agent registration velocity", "severity": "MEDIUM", "action": "FLAG"},
    {"code": "NOSHOW_RATE", "name": "No-show rate", "severity": "MEDIUM", "action": "FLAG"},
    {"code": "FUNDING_ANOMALY", "name": "Funding anomaly", "severity": "HIGH", "action": "FLAG"},
    {"code": "CHARGEBACK", "name": "Chargeback after spend", "severity": "CRITICAL", "action": "RESTRICT"},
    {"code": "CREDIT_BUSTOUT", "name": "Credit bust-out pattern", "severity": "HIGH", "action": "RESTRICT"},
    {"code": "DUPLICATE_IDENTITY", "name": "Duplicate identity", "severity": "CRITICAL", "action": "BLOCK"},
    {"code": "UNRETURNED_48H", "name": "Battery unreturned 48h", "severity": "HIGH", "action": "SUSPEND"},
    {"code": "MANUAL_FLAG", "name": "Manual ops flag", "severity": "MEDIUM", "action": "FLAG"},
]

_STAFF_NOTIFY_RULES = frozenset({"SWAP_VELOCITY", "GEO_IMPOSSIBLE"})


class RiskService:
    @staticmethod
    def ensure_rules() -> None:
        for row in DEFAULT_RULES:
            RiskRule.objects.get_or_create(
                code=row["code"],
                defaults={
                    "name": row["name"],
                    "severity": row["severity"],
                    "action": row["action"],
                    "enabled": True,
                    "params": row.get("params") or {},
                },
            )

    @staticmethod
    def emit(
        *,
        rule_code: str,
        subject_type: str,
        subject_id: str,
        account=None,
        severity: str | None = None,
        score: int = 0,
        context: dict | None = None,
        action_taken: str = "",
    ) -> RiskEvent:
        RiskService.ensure_rules()
        rule = RiskRule.objects.filter(code=rule_code, enabled=True).first()
        if rule is None:
            raise DomainError(
                "NOT_FOUND", f"Risk rule {rule_code} not found or disabled."
            )
        with transaction.atomic():
            event = RiskEvent.objects.create(
                rule=rule,
                account=account,
                subject_type=(subject_type or "").lower()[:40],
                subject_id=str(subject_id)[:64],
                severity=severity or rule.severity,
                score=score,
                context=context or {},
                action_taken=action_taken or rule.action,
                status=RiskEvent.Status.OPEN,
            )
            emit_event(
                action="risk_event.opened",
                subject_type="risk_event",
                subject_id=str(event.id),
                subject_label=rule.code,
                metadata={
                    "rule": rule.code,
                    "account_id": str(account.id) if account else None,
                    "subject_type": event.subject_type,
                    "subject_id": event.subject_id,
                },
            )
            if rule.code in _STAFF_NOTIFY_RULES:
                event_id = str(event.id)
                code = rule.code
                reason = (context or {}).get("reason") or rule.action

                def _notify() -> None:
                    from risk.services.notify_staff import notify_risk_reviewers

                    notify_risk_reviewers(
                        title=f"Risk · {code}",
                        body=f"{code} · {reason}. Open the risk queue to review.",
                        link_path=f"/risk/{event_id}",
                        dedupe_key=f"risk.event.opened:{event_id}",
                    )

                transaction.on_commit(_notify)
            return event

    @staticmethod
    def review(
        *,
        event: RiskEvent,
        status: str,
        reviewer,
        note: str = "",
        allow_swap: bool | None = None,
        ttl_hours: int | None = None,
        max_uses: int | None = None,
    ) -> RiskEvent:
        if status not in {
            RiskEvent.Status.REVIEWED_OK,
            RiskEvent.Status.REVIEWED_FRAUD,
            RiskEvent.Status.ESCALATED,
        }:
            raise DomainError("VALIDATION_ERROR", "Invalid review status.")
        with transaction.atomic():
            locked = (
                RiskEvent.objects.select_for_update(of=("self",))
                .select_related("rule", "account")
                .get(pk=event.pk)
            )
            should_grant = (
                status == RiskEvent.Status.REVIEWED_OK
                and locked.rule.code == "SWAP_VELOCITY"
                and (True if allow_swap is None else bool(allow_swap))
            )
            note_clean = (note or "").strip()
            if should_grant and not note_clean:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "A review note is required to grant a velocity exception.",
                    details={"note": ["required"]},
                )
            locked.status = status
            locked.reviewed_by = reviewer
            locked.review_note = note_clean[:4000]
            locked.save(
                update_fields=["status", "reviewed_by", "review_note", "updated_at"]
            )
            grant = None
            if should_grant:
                from risk.services.velocity_grants import create_velocity_grant

                grant = create_velocity_grant(
                    event=locked,
                    reviewer=reviewer,
                    note=locked.review_note,
                    ttl_hours=ttl_hours,
                    max_uses=max_uses,
                )
            emit_event(
                action="risk_event.reviewed",
                subject_type="risk_event",
                subject_id=str(locked.id),
                subject_label=locked.rule.code,
                actor=reviewer,
                metadata={
                    "status": status,
                    "velocity_grant_id": str(grant.id) if grant else None,
                },
            )
            return locked
