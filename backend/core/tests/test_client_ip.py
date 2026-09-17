"""Client IP helper — trusted proxy walk, no stale/spoofed leftmost XFF."""
from __future__ import annotations

from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings

from audit.models import AuditEvent
from core.helpers.client_ip import (
    bind_request,
    current_client_ip,
    get_client_ip,
    unbind_request,
)
from core.services.events import emit_event


class ClientIpHelperTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_remote_addr_when_no_proxy_trust(self):
        request = self.factory.get("/", REMOTE_ADDR="203.0.113.10")
        request.META["HTTP_X_FORWARDED_FOR"] = "198.51.100.1, 203.0.113.10"
        with override_settings(CLIENT_IP_TRUSTED_PROXIES=[], CLIENT_IP_TRUSTED_HOPS=0):
            self.assertEqual(get_client_ip(request), "203.0.113.10")

    def test_trusted_cidrs_walk_right_to_left(self):
        request = self.factory.get("/", REMOTE_ADDR="10.0.0.5")
        # spoofed, client, edge-proxy
        request.META["HTTP_X_FORWARDED_FOR"] = "198.51.100.1, 203.0.113.50, 10.0.0.5"
        with override_settings(
            CLIENT_IP_TRUSTED_PROXIES=["10.0.0.0/8"],
            CLIENT_IP_TRUSTED_HOPS=0,
            CLIENT_IP_CLOUDFLARE=False,
        ):
            self.assertEqual(get_client_ip(request), "203.0.113.50")

    def test_trusted_hops(self):
        request = self.factory.get("/", REMOTE_ADDR="10.0.0.5")
        request.META["HTTP_X_FORWARDED_FOR"] = "203.0.113.9, 10.0.0.5"
        with override_settings(
            CLIENT_IP_TRUSTED_PROXIES=[],
            CLIENT_IP_TRUSTED_HOPS=1,
            CLIENT_IP_CLOUDFLARE=False,
        ):
            self.assertEqual(get_client_ip(request), "203.0.113.9")

    def test_cloudflare_only_when_remote_trusted(self):
        request = self.factory.get("/", REMOTE_ADDR="10.0.0.8")
        request.META["HTTP_CF_CONNECTING_IP"] = "203.0.113.77"
        request.META["HTTP_X_FORWARDED_FOR"] = "198.51.100.1"
        with override_settings(
            CLIENT_IP_TRUSTED_PROXIES=["10.0.0.0/8"],
            CLIENT_IP_CLOUDFLARE=True,
            CLIENT_IP_TRUSTED_HOPS=0,
        ):
            self.assertEqual(get_client_ip(request), "203.0.113.77")

    def test_context_current_ip_not_stale_across_requests(self):
        a = self.factory.get("/", REMOTE_ADDR="203.0.113.1")
        b = self.factory.get("/", REMOTE_ADDR="203.0.113.2")
        with override_settings(CLIENT_IP_TRUSTED_PROXIES=[], CLIENT_IP_TRUSTED_HOPS=0):
            bind_request(a)
            a.client_ip = get_client_ip(a)
            self.assertEqual(current_client_ip(), "203.0.113.1")
            unbind_request(a)

            bind_request(b)
            b.client_ip = get_client_ip(b)
            self.assertEqual(current_client_ip(), "203.0.113.2")
            unbind_request(b)

            self.assertIsNone(current_client_ip())


class EmitEventIpTests(TestCase):
    def test_emit_event_fills_ip_from_request_context(self):
        factory = RequestFactory()
        request = factory.get("/", REMOTE_ADDR="198.51.100.40")
        request.request_id = "req-ip-1"
        with override_settings(CLIENT_IP_TRUSTED_PROXIES=[], CLIENT_IP_TRUSTED_HOPS=0):
            bind_request(request)
            request.client_ip = get_client_ip(request)
            try:
                result = emit_event(
                    action="test.ip_capture",
                    subject_type="test",
                    subject_id="1",
                )
            finally:
                unbind_request(request)
        row = AuditEvent.objects.get(pk=result.audit.pk)
        self.assertEqual(row.ip_address, "198.51.100.40")
        self.assertEqual(row.request_id, "req-ip-1")
