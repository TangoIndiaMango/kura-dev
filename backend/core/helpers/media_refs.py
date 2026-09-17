"""Resolve stored media refs (MediaAsset id, Cloudinary key, or absolute URL)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from core.models import MediaAsset
from core.services.cloudinary import cloudinary_delivery_url
from core.services.media import delivery_url


def _label_from_ref(ref: str) -> str:
    path = ref.split("?")[0].rstrip("/")
    leaf = path.split("/")[-1]
    if leaf and leaf not in {"png", "jpg", "jpeg", "webp", "gif"}:
        return leaf
    # placehold.co/?text=Intake+hull
    if "text=" in ref:
        from urllib.parse import parse_qs, urlparse, unquote_plus

        q = parse_qs(urlparse(ref).query)
        text = q.get("text", [None])[0]
        if text:
            return unquote_plus(text).replace("+", " ")
    return leaf or ref


def resolve_media_ref(ref: str | None) -> dict[str, Any] | None:
    raw = (ref or "").strip()
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        return {
            "id": raw,
            "url": raw,
            "label": _label_from_ref(raw),
            "content_type": "image/jpeg",
        }
    try:
        asset = MediaAsset.objects.filter(pk=UUID(str(raw))).first()
    except (ValueError, TypeError):
        asset = None
    if asset is not None:
        url = delivery_url(asset)
        return {
            "id": str(asset.id),
            "url": url,
            "label": asset.original_filename or _label_from_ref(asset.storage_key),
            "content_type": asset.content_type or "image/jpeg",
        }
    url = cloudinary_delivery_url(raw, resource_type="image")
    return {
        "id": raw,
        "url": url,
        "label": _label_from_ref(raw),
        "content_type": "image/jpeg",
    }


def resolve_media_refs(refs: list | None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in refs or []:
        resolved = resolve_media_ref(str(item) if item is not None else None)
        if resolved is not None:
            out.append(resolved)
    return out
