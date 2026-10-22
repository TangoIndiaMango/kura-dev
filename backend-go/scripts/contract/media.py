"""Media upload: parser (415 for JSON), validation (no file, kind, type,
empty), real Cloudinary uploads (image, sniffed PDF, multi-file) and the
MediaAsset rows. Storage keys / ids differ per backend."""
import base64
import json
import sys
import urllib.request
import uuid

from lib import DJ, GO, call, check, fresh, sql, summary

BASE = {"django": DJ, "go": GO}
TOK = {k: call(BASE[k], "POST", "/api/v1/auth/pin/login/", {"phone": "+2348033330001", "pin": "1234"})[1]["access"]
       for k in BASE}
U = "/api/v1/media/upload/"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
VOL = ("id", "url", "storage_key", "request_id")


def multipart(fields, files):
    b = "----ct" + uuid.uuid4().hex
    out = b""
    for k, v in fields.items():
        out += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    for key, name, ctype, data in files:
        out += (f"--{b}\r\nContent-Disposition: form-data; name=\"{key}\"; filename=\"{name}\"\r\n"
                f"Content-Type: {ctype}\r\n\r\n").encode() + data + b"\r\n"
    return out + f"--{b}--\r\n".encode(), f"multipart/form-data; boundary={b}"


def post(base, tok, fields=None, files=(), raw=None, ctype=None, query=""):
    if raw is None:
        raw, ctype = multipart(fields or {}, files)
    req = urllib.request.Request(base + U + query, data=raw, method="POST",
                                 headers={"Content-Type": ctype, "Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def step(name, **kw):
    out = {k: post(BASE[k], TOK[k], **kw) for k in BASE}
    check(name, out["django"], out["go"], extra=VOL)
    return out


fresh()
step("json body (415)", raw=b"{}", ctype="application/json")
step("no files", fields={"kind": "x"})
step("bad kind", files=[("file", "a.png", "image/png", PNG)], fields={"kind": "Bad Kind!"})
step("bad kind via query", files=[("file", "a.png", "image/png", PNG)], query="?kind=a%20b")
step("unsupported type", files=[("file", "a.txt", "text/plain", b"hi")])
step("empty file", files=[("file", "a.png", "image/png", b"")])
ids = {k: [] for k in BASE}
for name, kw in [("png", dict(files=[("file", "dot.png", "image/png", PNG)], fields={"kind": "CT-Test"})),
                 ("sniffed pdf", dict(files=[("files", "doc.PDF", "application/octet-stream", PDF)])),
                 ("two files", dict(files=[("file[]", "a.png", "image/png", PNG), ("files[]", "b.png", "image/png", PNG)],
                                    query="?kind=support"))]:
    out = step(f"upload {name}", **kw)
    for k in BASE:
        ids[k] += [f["id"] for f in out[k][1].get("files", [])]
rows = {k: [tuple(r) for r in sql("SELECT provider, kind, content_type, resource_type, byte_size, width, height, "
                                  "original_filename, visibility, storage_key LIKE 'kura%' OR storage_key LIKE 'uploads%' "
                                  "FROM core_mediaasset WHERE id IN ('" + "','".join(ids[k]) + "') ORDER BY created_at")]
        for k in BASE}
check("db: assets", (200, rows["django"]), (200, rows["go"]))
for k in BASE:
    if ids[k]:
        sql("DELETE FROM core_mediaasset WHERE id IN ('" + "','".join(ids[k]) + "')")
sys.exit(1 if summary() else 0)
