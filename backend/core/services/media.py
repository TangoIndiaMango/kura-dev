"""Media upload + delivery — provider-neutral MediaAsset rows."""
from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from django.conf import settings
from django.db import transaction

from core.exceptions import DomainError
from core.ids import uuid7
from core.models import MediaAsset
from core.services.cloudinary import (
    cloudinary_configured,
    configure_cloudinary,
    cloudinary_delivery_url,
    resource_type_for_mime,
)

ALLOWED_MIME = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

KIND_RE = re.compile(r"^[a-z0-9_-]{1,40}$")


def _active_provider() -> str:
    raw = (getattr(settings, "MEDIA_PROVIDER", None) or MediaAsset.Provider.CLOUDINARY).strip().lower()
    if raw not in {c.value for c in MediaAsset.Provider}:
        raise DomainError(
            "MEDIA_UNAVAILABLE",
            f"Unsupported media provider: {raw}",
            http=503,
        )
    return raw


def _kind_folder(kind: str | None) -> str:
    base = (settings.CLOUDINARY_FOLDER or "uploads").strip().strip("/") or "uploads"
    if not kind:
        return base
    cleaned = kind.strip().lower()
    if not KIND_RE.match(cleaned):
        raise DomainError(
            "VALIDATION_ERROR",
            "Invalid upload kind.",
            details={"kind": ["use letters, numbers, _ or -"]},
        )
    return f"{base}/{cleaned}"


def _max_bytes(mime: str) -> int:
    if mime.startswith("image/"):
        return int(settings.MEDIA_MAX_IMAGE_BYTES)
    return int(settings.MEDIA_MAX_DOCUMENT_BYTES)


def _validate_file(uploaded) -> tuple[str, str]:
    if uploaded is None:
        raise DomainError("VALIDATION_ERROR", "File is required.", details={"file": ["required"]})
    mime = (getattr(uploaded, "content_type", None) or "").lower().strip()
    name = getattr(uploaded, "name", "") or "upload"
    if not mime or mime == "application/octet-stream":
        lower = name.lower()
        if lower.endswith((".jpg", ".jpeg")):
            mime = "image/jpeg"
        elif lower.endswith(".png"):
            mime = "image/png"
        elif lower.endswith(".webp"):
            mime = "image/webp"
        elif lower.endswith(".gif"):
            mime = "image/gif"
        elif lower.endswith(".pdf"):
            mime = "application/pdf"
        elif lower.endswith(".doc"):
            mime = "application/msword"
        elif lower.endswith(".docx"):
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if mime not in ALLOWED_MIME:
        raise DomainError(
            "VALIDATION_ERROR",
            "Unsupported file type. Use images, PDF, or Word documents.",
            details={"file": ["unsupported_type"], "content_type": mime},
        )
    size = int(getattr(uploaded, "size", 0) or 0)
    limit = _max_bytes(mime)
    if size <= 0:
        raise DomainError("VALIDATION_ERROR", "Empty file.", details={"file": ["empty"]})
    if size > limit:
        kind = "image" if mime.startswith("image/") else "document"
        mb = limit // (1024 * 1024)
        raise DomainError(
            "VALIDATION_ERROR",
            f"{kind.title()}s must be under {mb} MB.",
            details={"file": ["too_large"], "max_bytes": limit},
        )
    return mime, name


def delivery_url(asset: MediaAsset | None) -> str | None:
    """Build a CDN URL for an asset. Never persist this string on domain rows."""
    if asset is None:
        return None
    if asset.provider == MediaAsset.Provider.CLOUDINARY:
        return cloudinary_delivery_url(
            asset.storage_key,
            resource_type=asset.resource_type or "image",
            authenticated=asset.visibility == MediaAsset.Visibility.AUTHENTICATED,
        )
    return None


def serialize_asset(asset: MediaAsset) -> dict[str, Any]:
    url = delivery_url(asset)
    return {
        "id": str(asset.id),
        "url": url,
        "provider": asset.provider,
        "storage_key": asset.storage_key,
        "kind": asset.kind or None,
        "content_type": asset.content_type,
        "resource_type": asset.resource_type,
        "bytes": asset.byte_size,
        "width": asset.width,
        "height": asset.height,
        "original_filename": asset.original_filename or None,
        "visibility": asset.visibility,
    }


def resolve_owned_asset(*, user, asset_id: UUID | str | None) -> MediaAsset | None:
    """Resolve MediaAsset by id; require ownership when uploaded_by is set."""
    if not asset_id:
        return None
    try:
        asset = MediaAsset.objects.get(pk=asset_id)
    except (MediaAsset.DoesNotExist, ValueError, TypeError) as exc:
        raise DomainError(
            "VALIDATION_ERROR",
            "Unknown media asset.",
            details={"asset_id": ["invalid"]},
        ) from exc
    if asset.uploaded_by_id and asset.uploaded_by_id != user.id:
        raise DomainError(
            "FORBIDDEN",
            "You cannot attach media you did not upload.",
            http=403,
        )
    return asset


class MediaService:
    @staticmethod
    def _upload_cloudinary(*, uploaded, mime: str, kind: str | None) -> dict[str, Any]:
        if not cloudinary_configured():
            raise DomainError(
                "MEDIA_UNAVAILABLE",
                "File upload is not configured.",
                http=503,
            )
        import cloudinary.uploader

        configure_cloudinary()
        folder = _kind_folder(kind)
        preset = (settings.CLOUDINARY_UPLOAD_PRESET or "").strip()
        resource_type = resource_type_for_mime(mime)
        leaf = uuid7().hex
        options: dict[str, Any] = {
            "folder": folder,
            "public_id": leaf,
            "resource_type": resource_type,
            "use_filename": False,
            "unique_filename": False,
            "overwrite": False,
        }
        if preset:
            options["upload_preset"] = preset

        try:
            uploaded.seek(0)
        except Exception:
            pass

        try:
            raw = cloudinary.uploader.upload(uploaded, **options)
        except Exception as exc:
            raise DomainError(
                "MEDIA_UPLOAD_FAILED",
                "Could not upload file.",
                details={"reason": str(exc)[:200]},
                http=502,
            ) from exc

        storage_key = raw.get("public_id") or f"{folder}/{leaf}"
        return {
            "storage_key": storage_key,
            "resource_type": raw.get("resource_type") or resource_type,
            "byte_size": int(raw.get("bytes") or 0),
            "width": raw.get("width"),
            "height": raw.get("height"),
            "format": raw.get("format"),
        }

    @staticmethod
    @transaction.atomic
    def upload_files(*, files: list, kind: str | None = None, uploaded_by=None) -> dict[str, Any]:
        if not files:
            raise DomainError(
                "VALIDATION_ERROR",
                "At least one file is required.",
                details={"file": ["required"]},
            )
        max_files = int(settings.MEDIA_MAX_FILES_PER_REQUEST)
        if len(files) > max_files:
            raise DomainError(
                "VALIDATION_ERROR",
                f"At most {max_files} files per request.",
                details={"files": ["too_many"]},
            )

        provider = _active_provider()
        kind_clean = (kind or "").strip().lower() or ""
        if kind_clean and not KIND_RE.match(kind_clean):
            raise DomainError(
                "VALIDATION_ERROR",
                "Invalid upload kind.",
                details={"kind": ["use letters, numbers, _ or -"]},
            )

        results: list[dict[str, Any]] = []
        for uploaded in files:
            mime, original_name = _validate_file(uploaded)
            if provider == MediaAsset.Provider.CLOUDINARY:
                remote = MediaService._upload_cloudinary(
                    uploaded=uploaded, mime=mime, kind=kind_clean or None
                )
            else:
                raise DomainError(
                    "MEDIA_UNAVAILABLE",
                    f"Upload not implemented for provider {provider}.",
                    http=503,
                )

            asset = MediaAsset.objects.create(
                provider=provider,
                storage_key=remote["storage_key"],
                kind=kind_clean,
                content_type=mime,
                resource_type=remote["resource_type"],
                byte_size=remote["byte_size"],
                width=remote.get("width"),
                height=remote.get("height"),
                original_filename=original_name[:255],
                visibility=MediaAsset.Visibility.PUBLIC,
                uploaded_by=uploaded_by,
            )
            results.append(serialize_asset(asset))

        payload: dict[str, Any] = {"files": results, "count": len(results)}
        if len(results) == 1:
            payload["file"] = results[0]
        return payload
