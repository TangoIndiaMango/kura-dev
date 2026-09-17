"""Enqueue templated email (ImmediateBackend runs after commit locally)."""
from __future__ import annotations

from django.tasks import task


@task
def send_templated_email_task(
    *,
    to: str,
    subject: str,
    template: str,
    context: dict | None = None,
) -> bool:
    from core.helpers.mail import send_templated_email

    return send_templated_email(
        to=to,
        subject=subject,
        template=template,
        context=context or {},
    )
