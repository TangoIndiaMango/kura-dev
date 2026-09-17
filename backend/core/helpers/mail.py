"""Transactional email with CID brand marks and SMTP or console delivery."""
from __future__ import annotations

import logging
import mimetypes
from email.mime.image import MIMEImage
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger("kura.email")

# Mark tile (dark bg look) + circle mark with background
_BRAND_DIR = Path(__file__).resolve().parent.parent / "static" / "brand"
_CID_ASSETS = (
    ("kura_mark", "kura-mark-email.png", "kura-mark.png"),
    ("kura_mark_circle", "kura-mark-circle-email.png", "kura-mark-circle.png"),
)


def _brand_file(preferred: str, fallback: str) -> Path | None:
    for name in (preferred, fallback):
        path = _BRAND_DIR / name
        if path.is_file():
            return path
    return None


def _attach_brand_cids(msg: EmailMultiAlternatives) -> dict[str, str]:
    """Embed logos as Content-ID parts so clients show them offline."""
    cids: dict[str, str] = {}
    for cid, preferred, fallback in _CID_ASSETS:
        path = _brand_file(preferred, fallback)
        if path is None:
            continue
        data = path.read_bytes()
        subtype = mimetypes.guess_type(path.name)[0] or "image/png"
        main, sub = subtype.split("/", 1)
        if main != "image":
            continue
        img = MIMEImage(data, _subtype=sub)
        img.add_header("Content-ID", f"<{cid}>")
        img.add_header("Content-Disposition", "inline", filename=path.name)
        msg.attach(img)
        cids[cid] = f"cid:{cid}"
    return cids


def send_templated_email(
    *,
    to: str | list[str],
    subject: str,
    template: str,
    context: dict[str, Any] | None = None,
    reply_to: str | None = None,
    attachments: list[tuple[str, bytes, str]] | None = None,
) -> bool:
    recipients = [to] if isinstance(to, str) else list(to)
    recipients = [r.strip() for r in recipients if r and r.strip()]
    if not recipients:
        logger.warning("email_skipped_no_recipient template=%s", template)
        return False

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "KURA <noreply@kura.eco>")
    reply = reply_to or getattr(settings, "DEFAULT_REPLY_TO", "") or None

    msg = EmailMultiAlternatives(
        subject=subject,
        body="",
        from_email=from_email,
        to=recipients,
        reply_to=[reply] if reply else None,
    )
    cids = _attach_brand_cids(msg)

    ctx = {
        "support_email": getattr(settings, "KURA_SUPPORT_EMAIL", "") or "",
        "product_name": "Kura",
        "logo_mark_cid": cids.get("kura_mark", ""),
        "logo_circle_cid": cids.get("kura_mark_circle", ""),
        **(context or {}),
    }
    html_body = render_to_string(f"email/{template}.html", ctx)
    try:
        text_body = render_to_string(f"email/{template}.txt", ctx)
    except Exception:
        text_body = f"{subject}\n\nOpen this message in an HTML mail app to see the full note."

    msg.body = text_body
    msg.attach_alternative(html_body, "text/html")
    for filename, content, mimetype in attachments or []:
        msg.attach(filename, content, mimetype)

    fail_silently = bool(getattr(settings, "EMAIL_FAIL_SILENTLY", True))
    try:
        sent = msg.send(fail_silently=fail_silently)
        logger.info(
            "email_sent template=%s to=%s backend=%s sent=%s attachments=%s",
            template,
            recipients,
            getattr(settings, "EMAIL_BACKEND", ""),
            sent,
            len(attachments or []),
        )
        return bool(sent)
    except Exception:
        logger.exception("email_failed template=%s to=%s", template, recipients)
        if fail_silently:
            return False
        raise
