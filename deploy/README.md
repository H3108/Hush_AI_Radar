# Production Deployment

Hush AI Radar ships with three supported production paths. In all cases the
built artifact is `dist/server.cjs` + `dist/` static assets, produced by
`npm run build` (`vite build && esbuild server.ts`).

## Prerequisites (all paths)

Copy `.env.example` to `.env` and fill in:

| Var | Required | Notes |
|-----|----------|-------|
| `GEMINI_API_KEY` | yes | Gemini API key |
| `ADMIN_TOKEN` | yes | Admin console token, e.g. `openssl rand -hex 32` |
| `APP_URL` | recommended | Public URL used for self-referential links |

> Note: the *local* dev script (`npm run dev:local`) sets
> `HTTP_PROXY/HTTPS_PROXY` for development machines behind a proxy. Do not
> reuse those env vars on a production host.

---

## Path 1 — Docker (recommended)

```bash
docker build -t hush-ai-radar .
mkdir -p /opt/hush-ai-radar/data
cp .env /opt/hush-ai-radar/.env

docker run -d --name hush-ai-radar \
  -p 3000:3000 \
  --env-file /opt/hush-ai-radar/.env \
  -v /opt/hush-ai-radar/data:/app/data \
  --restart unless-stopped \
  hush-ai-radar

# Verify
curl http://localhost:3000/api/health
```

The image runs `HEALTHCHECK` against `/api/health` every 30s. The SQLite DB
lives in the `/app/data` volume (persists across container restarts/upgrades).

---

## Path 2 — systemd (bare metal / VM)

```bash
npm ci && npm run build

# Create service user and place artifacts
sudo useradd --system --home /opt/hush-ai-radar --shell /usr/sbin/nologin radar
sudo mkdir -p /opt/hush-ai-radar/data
sudo chown -R radar:radar /opt/hush-ai-radar
# copy dist/, package*.json into /opt/hush-ai-radar and run `sudo npm ci --omit=dev` there
sudo cp deploy/hush-ai-radar.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now hush-ai-radar
sudo systemctl status hush-ai-radar
```

- Logs: `journalctl -u hush-ai-radar -f`
- Restart policy: `Restart=on-failure` + `RestartSec=5`

---

## Path 3 — Docker + logrotate for journald-forwarded logs

If you forward app logs to `/var/log/hush-ai-radar/radar.log` (e.g. a log
shipper), install the rotation policy:

```bash
sudo mkdir -p /var/log/hush-ai-radar
sudo cp deploy/logrotate.conf /etc/logrotate.d/hush-ai-radar
sudo logrotate -d /etc/logrotate.d/hush-ai-radar   # dry-run to verify
```

Policy: daily rotation, 14 days kept, compressed, 50 MB max size.

---

## Health check

`GET /api/health` returns:

```json
{ "status": "ok", "uptime": 4321, "timestamp": "2026-08-14T12:00:00.000Z" }
```

`503 + { "status": "degraded" }` when the DB is unreachable. Wire this to your
load balancer / uptime monitor / container orchestrator liveness probe.

## Scheduled jobs (run inside the Node process, no cron needed)

| Job | Schedule (UTC) |
|-----|----------------|
| Source sync + clustering | every 15 min |
| Daily brief | 00:05 |
| Weekly brief | Sun 23:55 |
| Monthly brief | 1st 23:55 |
