from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from django.conf import settings

from core.exceptions import DomainError
from core.helpers.http_client import request_json
from integrations.ports.psp import (
    NormalizedPspEvent,
    PspCode,
    VaProvisionResult,
    VerifyResult,
)
from integrations.providers.paystack.transform import normalize_paystack_payload


class PaystackPsp:
    code = PspCode.PAYSTACK
    base_url = "https://api.paystack.co"

    def __init__(self, *, secret_key: str | None = None):
        self.secret_key = secret_key or getattr(settings, "PAYSTACK_SECRET_KEY", "")

    def verify_webhook(self, *, headers: dict[str, str], raw_body: bytes) -> bool:
        if not self.secret_key:
            return False
        signature = _header(headers, "x-paystack-signature")
        if not signature:
            return False
        digest = hmac.new(
            self.secret_key.encode("utf-8"),
            raw_body,
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(digest, signature.strip())

    def normalize_webhook(self, *, raw_body: bytes) -> NormalizedPspEvent:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
        return normalize_paystack_payload(payload)

    def verify_transaction(self, *, psp_reference: str) -> VerifyResult:
        if not self.secret_key:
            raise DomainError("INTEGRATION_ERROR", "PAYSTACK_SECRET_KEY is not configured.")
        data = self._api("GET", f"/transaction/verify/{psp_reference}")
        status = str(data.get("status") or "")
        amount = data.get("amount")
        return VerifyResult(
            ok=status == "success",
            psp_reference=str(data.get("reference") or psp_reference),
            amount_kobo=int(amount) if amount is not None else None,
            currency=str(data.get("currency") or "NGN"),
            status=status,
            raw=data,
        )

    def provision_virtual_account(
        self,
        *,
        account_id: str,
        display_name: str,
        email: str | None,
        phone: str | None,
        bvn_or_nin: str | None = None,
    ) -> VaProvisionResult:
        if not self.secret_key:
            raise DomainError("INTEGRATION_ERROR", "PAYSTACK_SECRET_KEY is not configured.")
        customer_email = email or f"acct-{account_id}@yopmail.com"
        first = display_name.split(" ")[0] if display_name else "Operator"
        last = " ".join(display_name.split(" ")[1:]) or "KURA"
        customer = self._api(
            "POST",
            "/customer",
            {
                "email": customer_email,
                "first_name": first,
                "last_name": last,
                "phone": phone or "",
            },
        )
        customer_code = str(customer.get("customer_code") or "")
        body: dict[str, Any] = {
            "email": customer_email,
            "first_name": first,
            "last_name": last,
            "phone": phone or "",
            "preferred_bank": getattr(settings, "PAYSTACK_PREFERRED_BANK", "wema-bank"),
        }
        if bvn_or_nin:
            body["identification"] = {"type": "bvn", "number": bvn_or_nin}
        try:
            assigned = self._api("POST", "/dedicated_account/assign", body)
        except DomainError as exc:
            # Customer may already exist on Paystack; keep code so webhook can match later.
            raise DomainError(
                exc.code,
                str(exc),
                details={
                    **(exc.details or {}),
                    "customer_code": customer_code,
                    "customer": customer,
                },
                http=exc.http_status,
            ) from exc
        return VaProvisionResult(
            pending=True,
            psp_reference=str(
                customer_code
                or (assigned.get("customer") or {}).get("customer_code")
                or account_id
            ),
            raw={"customer": customer, "assign": assigned},
        )

    def _api(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        resp = request_json(
            method=method,
            url=f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {self.secret_key}"},
            body=body,
            provider="paystack",
        )
        payload = resp.data
        if not payload.get("status"):
            raise DomainError(
                "INTEGRATION_ERROR",
                payload.get("message") or "Paystack request failed.",
                details=payload,
            )
        data = payload.get("data")
        return data if isinstance(data, dict) else {"data": data}


def _header(headers: dict[str, str], name: str) -> str | None:
    target = name.lower()
    for key, value in headers.items():
        if key.lower() == target:
            return value
    return None
