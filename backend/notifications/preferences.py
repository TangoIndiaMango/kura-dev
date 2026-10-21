"""
Per-user notification preferences and template → category mapping.

Staff use ``email`` / ``push``. Riders get alert categories that gate the SMS
channel only — the in-app inbox row is always written. Security/legal
templates (PIN, phone change, sign-in, OTP, account status) never map to a
category, so they always send on every channel.
"""
from __future__ import annotations

from notifications.models import Notification

PREF_EMAIL = "email"
PREF_PUSH = "push"
PREF_SWAP_SMS = "swap_sms"
PREF_PAYMENT_ALERTS = "payment_alerts"
PREF_PLAN_EXPIRY = "plan_expiry"
PREF_LOAN_UPDATES = "loan_updates"

RIDER_ALERT_CATEGORIES = (
    PREF_SWAP_SMS,
    PREF_PAYMENT_ALERTS,
    PREF_PLAN_EXPIRY,
    PREF_LOAN_UPDATES,
)

DEFAULT_NOTIF_PREFS: dict[str, bool] = {
    PREF_EMAIL: True,
    PREF_PUSH: True,
    **{key: True for key in RIDER_ALERT_CATEGORIES},
}

# Checked first: anything here always sends regardless of prefs.
ALWAYS_SEND_PREFIXES = (
    "auth.",
    "otp.",
    "pin.",
    "phone.",
    "security.",
    "account.",
    "kyc.",
    "user.",
    "tariff.",
)

# Exact codes win over prefixes.
TEMPLATE_CATEGORY: dict[str, str] = {
    "swap.completed": PREF_SWAP_SMS,
    "cash.deposit_receipt": PREF_PAYMENT_ALERTS,
    "plan.purchased": PREF_PAYMENT_ALERTS,
    "plan.renewed": PREF_PAYMENT_ALERTS,
    "plan.expired": PREF_PLAN_EXPIRY,
    "plan.lapsed": PREF_PLAN_EXPIRY,
}

TEMPLATE_PREFIX_CATEGORY: tuple[tuple[str, str], ...] = (
    ("swap.", PREF_SWAP_SMS),
    ("payment.", PREF_PAYMENT_ALERTS),
    ("receipt.", PREF_PAYMENT_ALERTS),
    ("wallet.", PREF_PAYMENT_ALERTS),
    ("plan.expir", PREF_PLAN_EXPIRY),
    ("loan.", PREF_LOAN_UPDATES),
)

# Channels a rider category can switch off. IN_APP is never gated.
GATED_CHANNELS = frozenset({Notification.Channel.SMS})


def normalized_notif_prefs(raw: dict | None) -> dict[str, bool]:
    base = dict(DEFAULT_NOTIF_PREFS)
    if isinstance(raw, dict):
        for key in base:
            if key in raw:
                base[key] = bool(raw[key])
    return base


def category_for_template(template_code: str) -> str | None:
    code = (template_code or "").strip().lower()
    if not code or code.startswith(ALWAYS_SEND_PREFIXES):
        return None
    if code in TEMPLATE_CATEGORY:
        return TEMPLATE_CATEGORY[code]
    for prefix, category in TEMPLATE_PREFIX_CATEGORY:
        if code.startswith(prefix):
            return category
    return None


def allowed_channels(
    *, user, template_code: str, channels: tuple[str, ...]
) -> tuple[str, ...]:
    """Drop gated channels when the user turned this template's category off."""
    category = category_for_template(template_code)
    if category is None:
        return channels
    prefs = normalized_notif_prefs(getattr(user, "notification_prefs", None))
    if prefs.get(category, True):
        return channels
    return tuple(c for c in channels if c not in GATED_CHANNELS)
