"""Demo media URLs for Path B engine seed (real Unsplash photos)."""
from __future__ import annotations

from mobility.models import PetrolEngine

# Stable Unsplash CDN links (w=960). Pass-through via resolve_media_refs.
SEED_MEDIA = {
    "hull": (
        "https://images.unsplash.com/photo-1558981806-ec527fa84c39"
        "?auto=format&fit=crop&w=960&q=80"
    ),
    "engine": (
        "https://images.unsplash.com/photo-1646904748822-373f0fd5ea52"
        "?auto=format&fit=crop&w=960&q=80"
    ),
    "sig": (
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85"
        "?auto=format&fit=crop&w=640&q=80"
    ),
    "install": (
        "https://images.unsplash.com/photo-1623220988124-bcd1bad9a408"
        "?auto=format&fit=crop&w=960&q=80"
    ),
    "suz": (
        "https://images.unsplash.com/photo-1703181226028-b8845511bf59"
        "?auto=format&fit=crop&w=960&q=80"
    ),
    "legacy": (
        "https://images.unsplash.com/photo-1558980664-1db506751c6c"
        "?auto=format&fit=crop&w=960&q=80"
    ),
    "release": (
        "https://images.unsplash.com/photo-1558981359-219d6364c9c8"
        "?auto=format&fit=crop&w=960&q=80"
    ),
}


def refresh_engine_media(
    engine: PetrolEngine,
    *,
    photos: list[str],
    signature: str,
    release: list[str] | None = None,
    force: bool = True,
) -> None:
    dirty = False
    current_photos = list(engine.intake_photos or [])
    needs_photos = force or (not current_photos) or any(
        not str(p).startswith("http") or "placehold.co" in str(p)
        for p in current_photos
    )
    if needs_photos:
        engine.intake_photos = photos
        dirty = True
    needs_sig = force or (not engine.intake_signature) or (
        not str(engine.intake_signature).startswith("http")
        or "placehold.co" in str(engine.intake_signature)
    )
    if needs_sig:
        engine.intake_signature = signature
        dirty = True
    if release is not None:
        current_rel = list(engine.release_photos or [])
        needs_rel = force or (not current_rel) or any(
            not str(p).startswith("http") or "placehold.co" in str(p)
            for p in current_rel
        )
        if needs_rel:
            engine.release_photos = release
            dirty = True
    if dirty:
        engine.save(
            update_fields=[
                "intake_photos",
                "intake_signature",
                "release_photos",
                "updated_at",
            ]
        )
