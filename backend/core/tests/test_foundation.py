from django.test import SimpleTestCase, RequestFactory
from rest_framework.exceptions import ValidationError

from core.exceptions import DomainError, custom_exception_handler
from core.ids import reservation_code, uuid7
from core.money import split_vat_inclusive
from core.pagination import KuraCursorPagination, KuraPageNumberPagination
from core.responses import ok, created


class FoundationHelpersTests(SimpleTestCase):
    def test_uuid7_and_reservation_code(self):
        u = uuid7()
        self.assertIsNotNone(u)
        code = reservation_code()
        self.assertTrue(code.startswith("KB-"))
        self.assertEqual(len(code), 7)

    def test_vat_inclusive_alias(self):
        net, vat = split_vat_inclusive(150_000)
        self.assertEqual(net + vat, 150_000)

    def test_error_envelope_includes_request_id(self):
        factory = RequestFactory()
        request = factory.get("/x")
        request.request_id = "test-req-1"
        response = custom_exception_handler(
            DomainError("RESERVATION_EXPIRED", "Gone.", http=409),
            {"request": request},
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "RESERVATION_EXPIRED")
        self.assertEqual(response.data["error"]["request_id"], "test-req-1")

    def test_validation_error_envelope(self):
        factory = RequestFactory()
        request = factory.get("/x")
        request.request_id = "v1"
        response = custom_exception_handler(
            ValidationError({"field": ["required"]}),
            {"request": request},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(response.data["error"]["request_id"], "v1")

    def test_response_helpers(self):
        self.assertEqual(ok({"a": 1}).status_code, 200)
        self.assertEqual(created({"id": 1}).status_code, 201)

    def test_pagination_classes_exist(self):
        self.assertEqual(KuraCursorPagination.page_size, 25)
        self.assertEqual(KuraPageNumberPagination.page_size, 25)
