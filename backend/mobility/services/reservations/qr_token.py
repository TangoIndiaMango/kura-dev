"""Issue and reveal sealed reservation QR tokens."""
from __future__ import annotations

import logging

from django.core import signing

from core.helpers.crypto import decrypt_text, encrypt_text
from core.helpers.crypto_qr import build_reservation_token, token_hash
from mobility.models import Reservation

logger = logging.getLogger(__name__)


def issue_reservation_qr(*, reservation: Reservation) -> str:
    qr = build_reservation_token(
        reservation_id=str(reservation.id),
        exp_unix=int(reservation.expires_at.timestamp()),
        secret=str(reservation.id),
    )
    reservation.token_hash = token_hash(qr)
    reservation.token_ciphertext = encrypt_text(qr)
    return qr


def reveal_reservation_qr(reservation: Reservation) -> str | None:
    sealed = (getattr(reservation, "token_ciphertext", None) or "").strip()
    if not sealed:
        transient = getattr(reservation, "_qr_token", None)
        return transient if isinstance(transient, str) and transient else None
    try:
        plain = decrypt_text(sealed)
    except signing.BadSignature:
        logger.warning(
            "reservation_qr_decrypt_failed",
            extra={"reservation_id": str(reservation.id)},
        )
        return None
    stored = (reservation.token_hash or "").strip()
    if stored and stored != token_hash(plain):
        logger.warning(
            "reservation_qr_hash_mismatch",
            extra={"reservation_id": str(reservation.id)},
        )
        return None
    return plain
