package media

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Uploaded is the part of Cloudinary's upload response we keep.
type Uploaded struct {
	PublicID     string `json:"public_id"`
	ResourceType string `json:"resource_type"`
	Bytes        int64  `json:"bytes"`
	Width        *int32 `json:"width"`
	Height       *int32 `json:"height"`
	Format       string `json:"format"`
	Error        *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// sign is api_sign_request (SHA-1, signature version 2): sorted k=v pairs
// joined by "&" ("&" inside values escaped), then the secret.
func sign(params map[string]string, secret string) string {
	pairs := make([]string, 0, len(params))
	for k, v := range params {
		if v != "" {
			pairs = append(pairs, strings.ReplaceAll(k+"="+v, "&", "%26"))
		}
	}
	sort.Strings(pairs)
	sum := sha1.Sum([]byte(strings.Join(pairs, "&") + secret))
	return hex.EncodeToString(sum[:])
}

// Upload is cloudinary.uploader.upload with folder / public_id, no
// filename reuse, no overwrite (signed with the API key + secret).
func (c Cloudinary) Upload(ctx context.Context, client *http.Client, data []byte, filename, folder, publicID,
	resourceType string) (Uploaded, error) {
	params := map[string]string{"folder": folder, "public_id": publicID, "use_filename": "0",
		"unique_filename": "0", "overwrite": "0", "upload_preset": strings.TrimSpace(c.UploadPreset),
		"timestamp": strconv.FormatInt(time.Now().Unix(), 10)}
	params["signature"] = sign(params, c.APISecret)
	params["api_key"] = c.APIKey
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	for k, v := range params {
		if v != "" {
			_ = mw.WriteField(k, v)
		}
	}
	fw, err := mw.CreateFormFile("file", filename)
	if err == nil {
		_, err = fw.Write(data)
	}
	if err == nil {
		err = mw.Close()
	}
	if err != nil {
		return Uploaded{}, err
	}
	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/%s/upload", c.CloudName, resourceType)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
	if err != nil {
		return Uploaded{}, err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	resp, err := client.Do(req)
	if err != nil {
		return Uploaded{}, fmt.Errorf("Socket error: %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var out Uploaded
	if err := json.Unmarshal(raw, &out); err != nil {
		return Uploaded{}, fmt.Errorf("Error parsing server response (%d) - %s", resp.StatusCode, raw)
	}
	if out.Error != nil {
		return Uploaded{}, fmt.Errorf("%s", out.Error.Message)
	}
	return out, nil
}
