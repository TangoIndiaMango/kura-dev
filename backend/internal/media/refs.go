package media

import (
	"context"
	"net/url"
	"strings"

	"github.com/google/uuid"
)

// RefAsset is the MediaAsset row a stored ref may point at.
type RefAsset struct {
	Asset
	ID               uuid.UUID
	OriginalFilename string
	ContentType      string
}

// Lookup finds a MediaAsset by id (ok=false when absent).
type Lookup func(ctx context.Context, id uuid.UUID) (RefAsset, bool, error)

// Ref is resolve_media_ref's payload.
type Ref struct {
	ID          string  `json:"id"`
	URL         *string `json:"url"`
	Label       string  `json:"label"`
	ContentType string  `json:"content_type"`
}

var imageLeaves = map[string]bool{"png": true, "jpg": true, "jpeg": true, "webp": true, "gif": true}

// labelFromRef is _label_from_ref: the last path segment, else a ?text= label.
func labelFromRef(ref string) string {
	path := strings.TrimRight(strings.SplitN(ref, "?", 2)[0], "/")
	parts := strings.Split(path, "/")
	leaf := parts[len(parts)-1]
	if leaf != "" && !imageLeaves[leaf] {
		return leaf
	}
	if strings.Contains(ref, "text=") {
		if u, err := url.Parse(ref); err == nil {
			if t := u.Query().Get("text"); t != "" {
				return t
			}
		}
	}
	if leaf != "" {
		return leaf
	}
	return ref
}

// ResolveRef is resolve_media_ref: an absolute URL, a MediaAsset id, or a
// bare Cloudinary key. nil for an empty ref.
func (c Cloudinary) ResolveRef(ctx context.Context, find Lookup, ref string) (*Ref, error) {
	raw := strings.TrimSpace(ref)
	if raw == "" {
		return nil, nil
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return &Ref{ID: raw, URL: &raw, Label: labelFromRef(raw), ContentType: "image/jpeg"}, nil
	}
	if id, err := uuid.Parse(raw); err == nil {
		a, ok, err := find(ctx, id)
		if err != nil {
			return nil, err
		}
		if ok {
			label := a.OriginalFilename
			if label == "" {
				label = labelFromRef(a.StorageKey)
			}
			ct := a.ContentType
			if ct == "" {
				ct = "image/jpeg"
			}
			return &Ref{ID: a.ID.String(), URL: c.DeliveryURL(&a.Asset), Label: label, ContentType: ct}, nil
		}
	}
	return &Ref{ID: raw, URL: c.DeliveryURL(&Asset{Provider: "cloudinary", StorageKey: raw, ResourceType: "image"}),
		Label: labelFromRef(raw), ContentType: "image/jpeg"}, nil
}

// ResolveRefs is resolve_media_refs over a JSON list (non-strings are str()'d
// by the caller).
func (c Cloudinary) ResolveRefs(ctx context.Context, find Lookup, refs []string) ([]Ref, error) {
	out := []Ref{}
	for _, r := range refs {
		ref, err := c.ResolveRef(ctx, find, r)
		if err != nil {
			return nil, err
		}
		if ref != nil {
			out = append(out, *ref)
		}
	}
	return out, nil
}
