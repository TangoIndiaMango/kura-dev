#!/usr/bin/env bash
# Kura: install or update on a server that already runs other projects behind nginx.
# Sent and started by deploy-kura.bat; safe to run again. It only adds:
#   - /opt/kura: the API, worker, PostgreSQL and Redis in their own docker compose project
#   - one nginx site for the API domain (checked with "nginx -t"; taken out again if it fails)
#   - a free HTTPS certificate (certbot) once the domain points here
#   - a nightly database backup (/etc/cron.daily/kura-backup), 14 days kept
# It never changes other projects, their containers, the firewall or SSH.
set -euo pipefail
IN="$(cd "$(dirname "$0")" && pwd)"
OPT=/opt/kura
say()  { printf '\n== %s\n' "$*"; }
warn() { printf '!! %s\n' "$*"; }
die()  { printf '\nSTOPPED: %s\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root"
. "$IN/deploy.conf"
: "${API_DOMAIN:?API_DOMAIN missing in deploy.conf}"
: "${API_PORT:=8101}"

say "Checks"
command -v docker >/dev/null || die "Docker isn't installed."
docker compose version >/dev/null 2>&1 || die "The docker compose plugin isn't installed."
command -v nginx >/dev/null || die "nginx isn't installed."
for k in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DJANGO_SECRET_KEY; do
  grep -qE "^$k=.+" "$IN/production.env" || die "$k is empty in production.env"
done
grep -qE '^KURA_ENV=production' "$IN/production.env" || die "production.env must say KURA_ENV=production"
# the API port must be free, or already ours
owner="$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E "127\.0\.0\.1:${API_PORT}->|0\.0\.0\.0:${API_PORT}->" | awk '{print $1}' || true)"
if [ -n "$owner" ] && [ "$owner" != "kura-api-1" ]; then die "port $API_PORT is used by $owner; set another API_PORT in deploy.conf"; fi
if [ -z "$owner" ] && ss -ltn "( sport = :$API_PORT )" | grep -q LISTEN; then die "port $API_PORT is in use on this server; set another API_PORT in deploy.conf"; fi
free -m | awk '/Mem:/{printf "memory: %s MB total, %s MB available\n",$2,$7}'
df -h / | awk 'NR==2{print "disk: "$4" free"}'

say "Files in $OPT"
install -d -m 750 "$OPT" "$OPT/backups"
rm -rf "$OPT/src.new"; install -d "$OPT/src.new"
tar -xzf "$IN/kura-src.tgz" -C "$OPT/src.new"
[ -f "$OPT/src.new/backend/Dockerfile" ] || die "the code bundle has no backend/Dockerfile"
if [ -d "$OPT/src" ]; then rm -rf "$OPT/src.prev"; mv "$OPT/src" "$OPT/src.prev"; fi
mv "$OPT/src.new" "$OPT/src"
install -m 644 "$IN/docker-compose.yml" "$OPT/docker-compose.yml"
install -m 600 "$IN/production.env" "$OPT/production.env"
install -m 644 "$IN/deploy.conf" "$OPT/deploy.conf"
printf 'API_PORT=%s\n' "$API_PORT" >> "$OPT/production.env"
DC=(docker compose --project-directory "$OPT" -f "$OPT/docker-compose.yml" --env-file "$OPT/production.env")

say "Build"
if docker image inspect kura-api:latest >/dev/null 2>&1; then docker tag kura-api:latest kura-api:prev; fi
"${DC[@]}" build --pull api

say "Start"
"${DC[@]}" up -d db redis
"${DC[@]}" up -d --remove-orphans api worker
ok=""
for i in $(seq 1 45); do
  if curl -fsS --max-time 3 "http://127.0.0.1:$API_PORT/readyz" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ -z "$ok" ]; then
  warn "The new API didn't become ready. Last logs:"
  "${DC[@]}" logs --tail 60 api || true
  if docker image inspect kura-api:prev >/dev/null 2>&1; then
    warn "Going back to the previous version."
    docker tag kura-api:prev kura-api:latest
    "${DC[@]}" up -d api worker
  fi
  die "deploy failed (nothing else on the server was touched)"
fi
echo "API ready on 127.0.0.1:$API_PORT"
if [ "${SEED_DEMO:-no}" = "yes" ]; then
  # DEMO data (fake riders, wallets, public passwords) — test servers only. It skips itself once
  # the database has users, so it only ever loads into an empty database.
  "${DC[@]}" exec -T api /app/migrate seed
fi
# Production data on every deploy: permissions, roles and their grants (safe to repeat).
# With ADMIN_EMAIL set and no super admin yet, it also creates one and prints a one-time
# set-password link (valid 72 hours) — open it, then clear ADMIN_EMAIL.
BOOT=(/app/migrate bootstrap)
if [ -n "${ADMIN_EMAIL:-}" ]; then
  BOOT+=(--admin-email "$ADMIN_EMAIL" --first-name "${ADMIN_FIRST_NAME:-}" --last-name "${ADMIN_LAST_NAME:-}")
fi
"${DC[@]}" exec -T api "${BOOT[@]}"

say "nginx site for $API_DOMAIN"
install -d -m 755 /var/www/kura-acme
SITE=/etc/nginx/sites-available/kura-api.conf
[ -d /etc/nginx/sites-available ] || SITE=/etc/nginx/conf.d/kura-api.conf
if [ ! -f "$SITE" ]; then
  sed -e "s/__API_DOMAIN__/$API_DOMAIN/g" -e "s/__API_PORT__/$API_PORT/g" "$IN/nginx-kura-api.conf" > "$SITE"
  [ -d /etc/nginx/sites-enabled ] && ln -sf "$SITE" /etc/nginx/sites-enabled/kura-api.conf
  if nginx -t 2>/tmp/kura-nginx-test; then
    systemctl reload nginx; echo "site added"
  else
    cat /tmp/kura-nginx-test
    rm -f /etc/nginx/sites-enabled/kura-api.conf "$SITE"
    die "nginx didn't accept the Kura site, so it was taken out again (other sites untouched)"
  fi
else
  echo "site already there (left as is)"
fi

say "HTTPS"
SERVER_IP="$(curl -4fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
# ask public DNS (the server's own resolver may still cache "no such name" for a while)
DNS_IP="$( (command -v dig >/dev/null && dig +short A "$API_DOMAIN" @1.1.1.1 | grep -E '^[0-9.]+$' | head -1) || true)"
[ -n "$DNS_IP" ] || DNS_IP="$(curl -fsS --max-time 5 -H 'accept: application/dns-json' "https://cloudflare-dns.com/dns-query?name=$API_DOMAIN&type=A" 2>/dev/null | grep -oE '"data":"[0-9.]+"' | head -1 | cut -d'"' -f4 || true)"
[ -n "$DNS_IP" ] || DNS_IP="$(getent ahostsv4 "$API_DOMAIN" | awk '{print $1; exit}' || true)"
if certbot certificates 2>/dev/null | grep -q "Domains: .*\b$API_DOMAIN\b"; then
  echo "certificate for $API_DOMAIN already there (renews automatically)"
elif [ "$DNS_IP" = "$SERVER_IP" ]; then
  EMAIL_ARG=(--register-unsafely-without-email)
  [ -n "${CERT_EMAIL:-}" ] && EMAIL_ARG=(-m "$CERT_EMAIL")
  if certbot run -a webroot -w /var/www/kura-acme -i nginx -n --agree-tos "${EMAIL_ARG[@]}" \
       --redirect --cert-name "$API_DOMAIN" -d "$API_DOMAIN"; then
    nginx -t && systemctl reload nginx && echo "HTTPS is on for $API_DOMAIN"
  else
    warn "certbot couldn't get a certificate yet; run deploy-kura.bat again later"
  fi
else
  warn "$API_DOMAIN points to ${DNS_IP:-nothing}, not this server ($SERVER_IP): add the DNS A record, then run deploy-kura.bat again for HTTPS"
fi

say "Nightly backup"
cat > /etc/cron.daily/kura-backup <<'EOF'
#!/bin/sh
# Kura database dump, 14 days kept (/opt/kura/backups)
set -e
f="/opt/kura/backups/kura-$(date +%F).sql.gz"
docker exec kura-db-1 sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$f.tmp" && mv "$f.tmp" "$f"
chmod 600 "$f"
find /opt/kura/backups -name 'kura-*.sql.gz' -mtime +14 -delete
EOF
chmod 755 /etc/cron.daily/kura-backup
echo "installed"

say "Done"
"${DC[@]}" ps --format 'table {{.Name}}\t{{.Status}}'
curl -fsS --max-time 5 "http://127.0.0.1:$API_PORT/healthz" && echo
rm -rf "$OPT/src.prev"
