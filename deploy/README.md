# Kura deploy kit (Hostinger VPS)

The Go API, worker, PostgreSQL 17 and Redis run on the shared Hostinger VPS in their own
docker compose project (`/opt/kura`), next to the other projects on that server and without
touching them. The two frontends are on Vercel.

| Address | What |
|---|---|
| https://kuramobility.com | Landing page (`frontend/apps/landing`, Vercel) |
| https://app.kuramobility.com | Driver & Operator Portal (`frontend/apps/client`, Vercel) |
| https://admin.kuramobility.com | Operations & Command Center (`frontend/apps/admin`, Vercel) |
| https://api.kuramobility.com | Go API on the VPS (nginx + Let's Encrypt in front) |

Vercel needs `VITE_API_BASE_URL=https://api.kuramobility.com/api/v1` on all three projects; the landing page
also needs `VITE_APP_URL=https://app.kuramobility.com` and `VITE_SITE_URL=https://kuramobility.com`.

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

- Migrations run on every API start (`migrate up`). Every deploy then runs `migrate bootstrap`:
  permissions, roles and grants only (no demo riders, money or hubs), safe to repeat.
- First super admin: set `ADMIN_EMAIL` (and names) in `deploy.conf` for the first deploy; it prints a
  one-time set-password link (72 hours). Open it, then clear `ADMIN_EMAIL`. More staff are invited
  from the console.
- `SEED_DEMO=yes` loads demo data with public passwords — test servers only, never production.
- Backups: `/opt/kura/backups/kura-YYYY-MM-DD.sql.gz`, nightly, 14 days kept.
- `server.txt` holds the server IP; `deploy-kura.bat` copies it from `SocialSpot\deploy` if missing.
  SSH uses the PC's key (`%USERPROFILE%\.ssh\id_ed25519`), no password.
