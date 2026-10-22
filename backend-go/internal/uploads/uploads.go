// Package uploads ports POST /api/v1/media/upload/ (MediaService.upload_files):
// multipart files → Cloudinary → MediaAsset rows → {files, count, file}.
package uploads

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Limits are the MEDIA_* settings.
type Limits struct {
	Provider              string
	Folder                string
	MaxFiles              int
	MaxImage, MaxDocument int64
}

var (
	kindRe  = regexp.MustCompile(`^[a-z0-9_-]{1,40}$`)
	allowed = map[string]bool{"image/jpeg": true, "image/jpg": true, "image/png": true, "image/webp": true,
		"image/gif": true, "image/heic": true, "image/heif": true, "application/pdf": true,
		"application/msword": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true}
	byExt = []struct{ ext, mime string }{{".jpg", "image/jpeg"}, {".jpeg", "image/jpeg"}, {".png", "image/png"},
		{".webp", "image/webp"}, {".gif", "image/gif"}, {".pdf", "application/pdf"}, {".doc", "application/msword"},
		{".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}}
)

type handler struct {
	pool   *pgxpool.Pool
	cdn    media.Cloudinary
	limits Limits
	client *http.Client
}

func invalid(msg string, details apperr.Details) error {
	return apperr.New("VALIDATION_ERROR", msg).WithDetails(details)
}

// validate is _validate_file: MIME (sniffed from the name when generic),
// allow-list, non-empty, size cap by family.
func (h *handler) validate(f *multipart.FileHeader) (string, string, error) {
	ctype := strings.ToLower(strings.TrimSpace(f.Header.Get("Content-Type")))
	if i := strings.Index(ctype, ";"); i >= 0 {
		ctype = strings.TrimSpace(ctype[:i])
	}
	name := f.Filename
	if name == "" {
		name = "upload"
	}
	if ctype == "" || ctype == "application/octet-stream" {
		lower := strings.ToLower(name)
		for _, e := range byExt {
			if strings.HasSuffix(lower, e.ext) {
				ctype = e.mime
				break
			}
		}
	}
	if !allowed[ctype] {
		return "", "", invalid("Unsupported file type. Use images, PDF, or Word documents.",
			apperr.Details{"file": []string{"unsupported_type"}, "content_type": ctype})
	}
	limit, family := h.limits.MaxDocument, "document"
	if strings.HasPrefix(ctype, "image/") {
		limit, family = h.limits.MaxImage, "image"
	}
	if f.Size <= 0 {
		return "", "", invalid("Empty file.", apperr.Details{"file": []string{"empty"}})
	}
	if f.Size > limit {
		return "", "", invalid(fmt.Sprintf("%ss must be under %d MB.", strings.ToUpper(family[:1])+family[1:],
			limit/(1024*1024)), apperr.Details{"file": []string{"too_large"}, "max_bytes": limit})
	}
	return ctype, name, nil
}

func (h *handler) upload(w http.ResponseWriter, r *http.Request) {
	ct := strings.ToLower(r.Header.Get("Content-Type"))
	if !strings.HasPrefix(ct, "multipart/form-data") && !strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
		mt := strings.TrimSpace(strings.SplitN(r.Header.Get("Content-Type"), ";", 2)[0])
		respond.Error(w, r, apperr.New("UNSUPPORTED_MEDIA_TYPE",
			fmt.Sprintf("Unsupported media type \"%s\" in request.", mt)).WithStatus(http.StatusUnsupportedMediaType))
		return
	}
	if err := r.ParseMultipartForm(32 << 20); err != nil && err != http.ErrNotMultipart {
		respond.Error(w, r, apperr.Field("non_field_errors", "Multipart form parse error."))
		return
	}
	kind := r.FormValue("kind")
	var files []*multipart.FileHeader
	if r.MultipartForm != nil {
		for _, key := range []string{"file", "files", "file[]", "files[]"} {
			files = append(files, r.MultipartForm.File[key]...)
		}
	}
	out, err := h.store(r, files, kind)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, out)
}

func (h *handler) store(r *http.Request, files []*multipart.FileHeader, kind string) (map[string]any, error) {
	ctx := r.Context()
	if len(files) == 0 {
		return nil, invalid("At least one file is required.", apperr.Details{"file": []string{"required"}})
	}
	if len(files) > h.limits.MaxFiles {
		return nil, invalid(fmt.Sprintf("At most %d files per request.", h.limits.MaxFiles),
			apperr.Details{"files": []string{"too_many"}})
	}
	provider := strings.ToLower(strings.TrimSpace(h.limits.Provider))
	if provider == "" {
		provider = "cloudinary"
	}
	if provider != "cloudinary" {
		return nil, apperr.New("MEDIA_UNAVAILABLE", "Unsupported media provider: "+provider).
			WithStatus(http.StatusServiceUnavailable)
	}
	kind = strings.ToLower(strings.TrimSpace(kind))
	if kind != "" && !kindRe.MatchString(kind) {
		return nil, invalid("Invalid upload kind.", apperr.Details{"kind": []string{"use letters, numbers, _ or -"}})
	}
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	results := []map[string]any{}
	err := database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		for _, f := range files {
			ctype, name, err := h.validate(f)
			if err != nil {
				return err
			}
			row, err := h.push(r, q, f, ctype, name, kind, uid)
			if err != nil {
				return err
			}
			results = append(results, serialize(h.cdn, row))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	out := map[string]any{"files": results, "count": len(results)}
	if len(results) == 1 {
		out["file"] = results[0]
	}
	return out, nil
}

// push is _upload_cloudinary + the MediaAsset insert.
func (h *handler) push(r *http.Request, q *db.Queries, f *multipart.FileHeader, ctype, name, kind string,
	uid uuid.UUID) (db.CoreMediaasset, error) {
	if !h.cdn.Configured() {
		return db.CoreMediaasset{}, apperr.New("MEDIA_UNAVAILABLE", "File upload is not configured.").
			WithStatus(http.StatusServiceUnavailable)
	}
	folder := strings.Trim(strings.TrimSpace(h.limits.Folder), "/")
	if folder == "" {
		folder = "uploads"
	}
	if kind != "" {
		folder += "/" + kind
	}
	resource := "raw"
	if strings.HasPrefix(ctype, "image/") {
		resource = "image"
	}
	src, err := f.Open()
	var data []byte
	if err == nil {
		data, err = io.ReadAll(src)
		src.Close()
	}
	if err != nil {
		return db.CoreMediaasset{}, err
	}
	leaf := strings.ReplaceAll(ids.New().String(), "-", "")
	up, err := h.cdn.Upload(r.Context(), h.client, data, name, folder, leaf, resource)
	if err != nil {
		reason := err.Error()
		if len([]rune(reason)) > 200 {
			reason = string([]rune(reason)[:200])
		}
		return db.CoreMediaasset{}, apperr.New("MEDIA_UPLOAD_FAILED", "Could not upload file.").
			WithDetails(apperr.Details{"reason": reason}).WithStatus(http.StatusBadGateway)
	}
	key := up.PublicID
	if key == "" {
		key = folder + "/" + leaf
	}
	if up.ResourceType != "" {
		resource = up.ResourceType
	}
	if r := []rune(name); len(r) > 255 {
		name = string(r[:255])
	}
	return q.InsertMediaAsset(r.Context(), db.InsertMediaAssetParams{ID: ids.New(), Provider: "cloudinary",
		StorageKey: key, Kind: kind, ContentType: ctype, ResourceType: resource, ByteSize: int32(up.Bytes),
		Width: up.Width, Height: up.Height, OriginalFilename: name, UploadedByID: &uid})
}

// serialize is serialize_asset.
func serialize(cdn media.Cloudinary, a db.CoreMediaasset) map[string]any {
	var kind, name any
	if a.Kind != "" {
		kind = a.Kind
	}
	if a.OriginalFilename != "" {
		name = a.OriginalFilename
	}
	return map[string]any{"id": a.ID.String(), "url": cdn.DeliveryURL(&media.Asset{Provider: a.Provider,
		StorageKey: a.StorageKey, ResourceType: a.ResourceType, Visibility: a.Visibility}),
		"provider": a.Provider, "storage_key": a.StorageKey, "kind": kind, "content_type": a.ContentType,
		"resource_type": a.ResourceType, "bytes": a.ByteSize, "width": a.Width, "height": a.Height,
		"original_filename": name, "visibility": a.Visibility}
}

// Module mounts /api/v1/media/upload/ (media_upload throttle only).
type Module struct {
	h       *handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, cdn media.Cloudinary, limits Limits, limiter *throttle.Limiter) *Module {
	return &Module{h: &handler{pool: pool, cdn: cdn, limits: limits, client: &http.Client{Timeout: 60 * time.Second}},
		limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/media", m.limiter).Throttle(throttle.MustRule("media_upload", "30/hour"))
	g.User("POST", "/upload/", m.h.upload)
}
