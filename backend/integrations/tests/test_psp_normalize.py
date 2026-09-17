import hashlib
import hmac
import json

from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from integrations.ports.psp import PspEventKind
from integrations.providers.nomba.transform import normalize_nomba_payload
from integrations.providers.nomba.signature import (
    build_nomba_canonical_string,
    verify_nomba_signature,
)
from integrations.providers.paystack.client import PaystackPsp
from integrations.providers.paystack.transform import normalize_paystack_payload


class PaystackNormalizeTests(SimpleTestCase):
    def test_charge_success_normalizes_to_funding(self):
        payload = {
            "event": "charge.success",
            "data": {
                "id": 123,
                "reference": "ref_abc",
                "amount": 150000,
                "currency": "NGN",
                "customer": {"customer_code": "CUS_1"},
                "authorization": {
                    "receiver_bank_account_number": "9910482910",
                    "receiver_bank": "Wema Bank",
                    "account_name": "KURA / Rider",
                },
            },
        }
        event = normalize_paystack_payload(payload)
        self.assertEqual(event.kind, PspEventKind.FUNDING_SUCCESS)
        self.assertEqual(event.psp_reference, "ref_abc")
        self.assertEqual(event.amount_kobo, 150000)
        self.assertEqual(event.nuban, "9910482910")

    def test_verify_webhook_hmac(self):
        body = b'{"event":"charge.success"}'
        secret = "sk_test_secret"
        sig = hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()
        psp = PaystackPsp(secret_key=secret)
        self.assertTrue(
            psp.verify_webhook(headers={"x-paystack-signature": sig}, raw_body=body)
        )
        self.assertFalse(
            psp.verify_webhook(headers={"x-paystack-signature": "bad"}, raw_body=body)
        )


class NombaNormalizeTests(SimpleTestCase):
    def test_payment_success_normalizes(self):
        payload = {
            "event_type": "payment_success",
            "requestId": "req-1",
            "data": {
                "transaction": {
                    "transactionId": "txn-9",
                    "type": "virtual_account",
                    "transactionAmount": 1500.0,
                    "time": "2024-01-11T16:33:04Z",
                    "responseCode": "00",
                },
                "order": {"orderReference": "acct-1", "currency": "NGN"},
                "bankAccount": {
                    "accountNumber": "9171424534",
                    "bankName": "Amucha MFB",
                    "accountName": "KURA / Rider",
                },
                "merchant": {"userId": "u1", "walletId": "w1"},
            },
        }
        event = normalize_nomba_payload(payload)
        self.assertEqual(event.kind, PspEventKind.FUNDING_SUCCESS)
        self.assertEqual(event.psp_reference, "txn-9")
        self.assertEqual(event.amount_kobo, 150000)

    def test_signature_roundtrip(self):
        secret = "whsec_test"
        payload = {
            "event_type": "payment_success",
            "requestId": "req-1",
            "data": {
                "merchant": {"userId": "u1", "walletId": "w1"},
                "transaction": {
                    "transactionId": "txn-9",
                    "type": "virtual_account",
                    "time": "2024-01-11T16:33:04Z",
                    "responseCode": "00",
                },
            },
        }
        ts = "2024-01-11T16:33:05Z"
        canonical = build_nomba_canonical_string(
            event_type="payment_success",
            request_id="req-1",
            merchant_user_id="u1",
            merchant_wallet_id="w1",
            transaction_id="txn-9",
            transaction_type="virtual_account",
            transaction_time="2024-01-11T16:33:04Z",
            response_code="00",
            nomba_timestamp=ts,
        )
        import base64

        sig = base64.b64encode(
            hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).digest()
        ).decode()
        self.assertTrue(
            verify_nomba_signature(
                payload=payload,
                headers={"nomba-signature": sig, "nomba-timestamp": ts},
                secret=secret,
            )
        )


@override_settings(PAYSTACK_SECRET_KEY="sk_test")
class WebhookEndpointTests(TestCase):
    def test_paystack_rejects_bad_signature(self):
        client = APIClient()
        res = client.post(
            "/api/v1/webhooks/paystack",
            data=json.dumps({"event": "charge.success", "data": {"id": 1}}),
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE="nope",
        )
        self.assertEqual(res.status_code, 401)
