"""
Shared list filters. Domain FilterSets live next to the view that uses them
(e.g. mobility/filters.py) — do not invent unused base FilterSets here.

Only cross-cutting pieces that settings or many apps actually wire belong in core.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import connection
from django.db.models import Q
from rest_framework.filters import BaseFilterBackend

WAT = ZoneInfo("Africa/Lagos")


def wat_day_bounds(date_from=None, date_to=None):
    """
    Inclusive Africa/Lagos calendar days → UTC datetimes for created_at filters.
    Returns (start_utc | None, end_exclusive_utc | None).
    """
    start = end = None
    if date_from is not None:
        start = datetime.combine(date_from, time.min, tzinfo=WAT).astimezone(ZoneInfo("UTC"))
    if date_to is not None:
        end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=WAT).astimezone(
            ZoneInfo("UTC")
        )
    return start, end


class TrigramSearchFilter(BaseFilterBackend):
    """
    `?q=` over view.search_fields.
    Postgres: pg_trgm when available; else icontains (SQLite / local).
    """

    search_param = "q"
    similarity_threshold = 0.3

    def filter_queryset(self, request, queryset, view):
        term = request.query_params.get(self.search_param, "").strip()
        if not term:
            return queryset

        fields = getattr(view, "search_fields", None) or ()
        if not fields:
            return queryset

        if connection.vendor == "postgresql" and getattr(
            settings, "PG_TRGM_ENABLED", False
        ):
            try:
                from django.contrib.postgres.search import TrigramSimilarity

                annotated = queryset
                sims = []
                for i, field in enumerate(fields):
                    alias = f"_sim_{i}"
                    annotated = annotated.annotate(**{alias: TrigramSimilarity(field, term)})
                    sims.append(alias)
                if not sims:
                    return queryset
                q = Q(**{f"{sims[0]}__gte": self.similarity_threshold})
                for alias in sims[1:]:
                    q |= Q(**{f"{alias}__gte": self.similarity_threshold})
                return annotated.filter(q).order_by(*[f"-{a}" for a in sims])
            except Exception:
                pass

        q = Q()
        for field in fields:
            if field.startswith("^"):
                q |= Q(**{f"{field[1:]}__istartswith": term})
            elif field.startswith("="):
                q |= Q(**{f"{field[1:]}__iexact": term})
            else:
                q |= Q(**{f"{field}__icontains": term})
        return queryset.filter(q)
