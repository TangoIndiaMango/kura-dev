"""Cloudinary configure + delivery helpers (provider adapter)."""
from __future__ import annotations

from django.conf import settings


def cloudinary_configured() -> bool:
    name = (settings.CLOUDINARY_CLOUD_NAME or "").strip()
    if not name:
        return False
    if (settings.CLOUDINARY_UPLOAD_PRESET or "").strip():
        return True
    return bool(
        (settings.CLOUDINARY_API_KEY or "").strip()
        and (settings.CLOUDINARY_API_SECRET or "").strip()
    )


def configure_cloudinary() -> None:
    import cloudinary

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY or None,
        api_secret=settings.CLOUDINARY_API_SECRET or None,
        secure=True,
    )


def resource_type_for_mime(mime: str) -> str:
    if mime.startswith("image/"):
        return "image"
    return "raw"


def cloudinary_delivery_url(
    storage_key: str | None,
    *,
    resource_type: str = "image",
    authenticated: bool = False,
) -> str | None:
    """Build a delivery URL from a Cloudinary storage key (public_id)."""
    if not storage_key:
        return None
    value = storage_key.strip()
    if not value:
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if not cloudinary_configured():
        return None
    configure_cloudinary()
    import cloudinary.utils

    opts: dict = {
        "secure": True,
        "resource_type": resource_type,
        "fetch_format": "auto",
        "quality": "auto",
    }
    if authenticated:
        opts["type"] = "authenticated"
        # Signed URLs for identity docs can be added later (expires_at).
    url, _opts = cloudinary.utils.cloudinary_url(value, **opts)
    return url


# Back-compat aliases used by older call sites during the MediaAsset migration.
def media_url(public_id: str | None, *, resource_type: str = "image") -> str | None:
    return cloudinary_delivery_url(public_id, resource_type=resource_type)


def public_id_from_ref(value: str | None) -> str:
    """Accept public_id or Cloudinary URL; return storage key."""
    if not value:
        return ""
    raw = value.strip()
    if not raw:
        return ""
    if "res.cloudinary.com" in raw and "/upload/" in raw:
        after = raw.split("/upload/", 1)[1]
        parts = after.split("/")
        if parts and parts[0].startswith("v") and parts[0][1:].isdigit():
            parts = parts[1:]
        path = "/".join(parts)
        return path.rsplit(".", 1)[0] if "." in parts[-1] else path
    return raw
