"""
Pagination — 2026 defaults (kura-docs 03 §12).

- Cursor: feeds (swaps, payments, activity, audit) — O(1) at depth, no count.
- Page: small admin catalogues (hubs, plans, roles) — includes count.
"""
from __future__ import annotations

from rest_framework.pagination import CursorPagination, PageNumberPagination
from rest_framework.response import Response


class KuraCursorPagination(CursorPagination):
    """Keyset pagination for high-churn feeds."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = ("-created_at", "-id")
    cursor_query_param = "cursor"

    def get_paginated_response(self, data):
        return Response(
            {
                "results": data,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "required": ["results"],
            "properties": {
                "results": schema,
                "next": {"type": "string", "nullable": True, "format": "uri"},
                "previous": {"type": "string", "nullable": True, "format": "uri"},
            },
        }


class KuraPageNumberPagination(PageNumberPagination):
    """Offset pagination only for small admin tables (< ~10k rows)."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "page_size": self.get_page_size(self.request),
                "current_page": self.page.number,
                "total_pages": self.page.paginator.num_pages,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


# Back-compat alias used in older imports / settings comments
KuraPagePagination = KuraPageNumberPagination
