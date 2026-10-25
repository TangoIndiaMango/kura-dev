# Kura deploy kit (Hostinger VPS)

The Go API, worker, PostgreSQL 17 and Redis run on the shared Hostinger VPS in their own
docker compose project (`/opt/kura`), next to the other projects on that server and without
touching them. The two frontends are on Vercel.

| Address | What |
|---|---|
| https://kuramobility.com | Driver & Operator Portal (`frontend/apps/client`, Vercel) |
| https://admin.kuramobility.com | Operations & Command Center (`frontend/apps/admin`, Vercel) |
| https://api.kuramobility.com | Go API on the VPS (nginx + Let's Encrypt in front) |

Vercel needs one variable on both projects: `VITE_API_BASE_URL=https://api.kuramobility.com/api/v1`.

## Files

| File | |
|---|---|
| `deploy-kura.bat` | Installs or updates the backend on the server (Windows). Run it for every backend release. |
| `kura-status.bat` | Containers, health, last log lines, latest backups. Changes nothing. |
| `kura-server.sh` | What runs on the server: build, migrate, start, health check (rolls back on failure), nginx site, HTTPS, nightly backup. |
| `docker-compose.yml` | Production services. db/redis have no host ports; the API listens on 127.0.0.1 only. |
| `nginx-kura-api.conf` | nginx site for the API domain. |
| `deploy.conf` | Domain, local port, starter-data switch (not secret). |
| `production.env.example` | Settings template. The real `production.env` and `server.txt` stay on the deploying PC (gitignored). |

## Notes

- Migrations run on every API start (`migrate up`). The starter seed (`SEED_DEMO=yes`) only
  loads into an empty database; it includes demo logins with public passwords: change them.
- Backups: `/opt/kura/backups/kura-YYYY-MM-DD.sql.gz`, nightly, 14 days kept.
- `server.txt` holds the server IP; `deploy-kura.bat` copies it from `SocialSpot\deploy` if missing.
  SSH uses the PC's key (`%USERPROFILE%\.ssh\id_ed25519`), no password.
