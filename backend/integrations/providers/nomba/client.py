from __future__ import annotations

import json
from typing import Any

from django.conf import settings

from core.exceptions import DomainError
from core.helpers.http_client import request_json
from core.money import naira_to_kobo
from integrations.ports.psp import (
    NormalizedPspEvent,
    PspCode,
    VaProvisionResult,
    VerifyResult,
)
from integrations.providers.nomba.transform import normalize_nomba_payload
from integrations.providers.nomba.signature import verify_nomba_signature


class NombaPsp:
    code = PspCode.NOMBA
    base_url = "https://api.nomba.com"

    def __init__(
        self,
        *,
        secret_key: str | None = None,
        webhook_secret: str | None = None,
        account_id: str | None = None,
    ):
        self.secret_key = secret_key or getattr(settings, "NOMBA_SECRET_KEY", "")
        self.webhook_secret = webhook_secret or getattr(
            settings, "NOMBA_WEBHOOK_SECRET", ""
        )
        self.account_id = account_id or getattr(settings, "NOMBA_ACCOUNT_ID", "")

    def verify_webhook(self, *, headers: dict[str, str], raw_body: bytes) -> bool:
        if not self.webhook_secret:
            return False
        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return False
        return verify_nomba_signature(
            payload=payload,
            headers=headers,
            secret=self.webhook_secret,
        )

    def normalize_webhook(self, *, raw_body: bytes) -> NormalizedPspEvent:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
        return normalize_nomba_payload(payload)

    def verify_transaction(self, *, psp_reference: str) -> VerifyResult:
        if not self.secret_key or not self.account_id:
            raise DomainError(
                "INTEGRATION_ERROR",
                "NOMBA_SECRET_KEY / NOMBA_ACCOUNT_ID are not configured.",
            )
        data = self._api(
            "GET", f"/v1/transactions/accounts/single?transactionId={psp_reference}"
        )
        status = str(data.get("status") or "").upper()
        amount = data.get("transactionAmount") or data.get("amount")
        amount_kobo = None
        if amount is not None:
            amount_kobo = naira_to_kobo(amount) if not isinstance(amount, int) else int(amount)
        return VerifyResult(
            ok=status in {"SUCCESS", "SUCCESSFUL"},
            psp_reference=str(data.get("transactionId") or psp_reference),
            amount_kobo=amount_kobo,
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
        if not self.secret_key or not self.account_id:
            raise DomainError(
                "INTEGRATION_ERROR",
                "NOMBA_SECRET_KEY / NOMBA_ACCOUNT_ID are not configured.",
            )
        body: dict[str, Any] = {
            "accountRef": account_id,
            "accountName": display_name[:100] or "KURA Operator",
            "currency": "NGN",
        }
        if bvn_or_nin:
            body["bvn"] = bvn_or_nin
        data = self._api("POST", "/v1/accounts/virtual", body)
        return VaProvisionResult(
            pending=False,
            psp_reference=str(data.get("accountRef") or account_id),
            nuban=str(data.get("bankAccountNumber") or "") or None,
            bank_name=str(data.get("bankName") or "") or None,
            account_name=str(data.get("bankAccountName") or data.get("accountName") or "")
            or None,
            raw=data,
        )

    def _api(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        resp = request_json(
            method=method,
            url=f"{self.base_url}{path}",
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "accountId": self.account_id,
            },
            body=body,
            provider="nomba",
        )
        payload = resp.data
        code = str(payload.get("code") or "")
        if code not in {"00", "0"} and not payload.get("status"):
            raise DomainError(
                "INTEGRATION_ERROR",
                payload.get("description")
                or payload.get("message")
                or "Nomba request failed.",
                details=payload,
            )
        data = payload.get("data")
        return data if isinstance(data, dict) else {"data": data}
