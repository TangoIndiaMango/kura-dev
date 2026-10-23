# syntax=docker/dockerfile:1.7
# KURA API + worker (Go). One image, two binaries:
#   api    — default command, serves :$PORT
#   worker — background sweeps (`command: ["/app/worker"]`)
FROM golang:1.27.1-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/worker ./cmd/worker

FROM debian:bookworm-slim
# curl: container healthcheck; tzdata: Africa/Lagos day boundaries.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl tzdata \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home kura \
 && mkdir -p /app/media \
 && chown kura:kura /app/media
WORKDIR /app
COPY --from=build /out/api /out/worker /app/
USER kura
# MEDIA_ROOT holds generated report files (Django's FileSystemStorage root).
ENV PORT=8000 MEDIA_ROOT=/app/media
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["/app/api"]
