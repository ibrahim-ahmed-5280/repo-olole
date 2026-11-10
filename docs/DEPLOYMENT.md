# Deployment

A safe **standalone** path: a dedicated Linux VM/VPS (Ubuntu 22.04+), Node.js 20/22, MongoDB 6+, Nginx, Let's Encrypt. Nothing here modifies other applications; if the server is shared, inspect it first and use a separate system user, port, Nginx `server` block and database.

## 1. Server preparation
```bash
sudo adduser --system --group --home /srv/the-reveal reveal
```
Install Node.js LTS and MongoDB from their official repositories. Create a dedicated database user:
```js
use the_reveal
db.createUser({ user: "reveal", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "the_reveal" }] })
```
Bind MongoDB to `127.0.0.1` and enable authorization (`security.authorization: enabled`).

## 2. Code & configuration
```bash
sudo -u reveal git clone <your-repo-url> /srv/the-reveal/app
```
```bash
cd /srv/the-reveal/app && sudo -u reveal npm ci
```
Create `/srv/the-reveal/app/.env` from `.env.example` (mode `600`, owner `reveal`):
```
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
MONGODB_URI=mongodb://reveal:<password>@127.0.0.1:27017/the_reveal?authSource=the_reveal
PUBLIC_ORIGIN=https://<your-domain>
ALLOWED_ORIGINS=https://<your-domain>
ANALYTICS_SECRET=<48+ random bytes, base64url>
COOKIE_SECURE=true
TRUST_PROXY=1
UPLOAD_DIR=/srv/the-reveal/uploads
SERVE_WEB=false
VITE_API_BASE=/api/v1
VITE_SITE_URL=https://<your-domain>
```
The API refuses to start in production with insecure cookies, a placeholder secret or rate limiting disabled.

## 3. Build, indexes, seed, first admin
```bash
sudo -u reveal npm run build
```
```bash
sudo -u reveal npm run db:init
```
```bash
sudo -u reveal npm run db:seed
```
```bash
sudo -u reveal npm run admin:create -- --username <owner-name> --role owner
```

## 4. Process manager
Copy `deploy/the-reveal-api.service` to `/etc/systemd/system/`, then:
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now the-reveal-api
```

## 5. Nginx + HTTPS
Copy `deploy/nginx.conf.example` to `/etc/nginx/sites-available/the-reveal`, set `server_name`, link it into `sites-enabled`, `sudo nginx -t`, reload, then:
```bash
sudo certbot --nginx -d <your-domain>
```
Nginx serves `apps/web/dist` (immutable hashed assets), proxies `/api/`, `/media/`, `/robots.txt`, `/sitemap.xml` to Node, applies an extra rate limit to `/api/v1/feedback` and `/api/v1/admin/auth/login`, and falls back to `index.html` for SPA routes.

(Alternative single-process mode: set `SERVE_WEB=true` and proxy everything to Node.)

## 6. Health checks & logging
* `GET /api/v1/health` → `200 {"status":"ok","db":"up"}` / `503` when MongoDB is unreachable. Point uptime monitoring at it.
* Logs are JSON on stdout → `journalctl -u the-reveal-api`. Configure journald retention (e.g. `MaxRetentionSec=14day`) to keep operational logs short-lived; `LOG_LEVEL=info`.

## 7. Backups
`scripts/backup.sh` runs `mongodump --gzip --archive` plus a tarball of `UPLOAD_DIR`, keeps 14 days. Schedule daily via cron/systemd timer and copy archives off-server (encrypted). Test a restore regularly:
```bash
mongorestore --gzip --archive=/var/backups/the-reveal/db-<stamp>.gz --nsInclude='the_reveal.*' --drop
```

## 8. Rollback
* **Content**: Admin → version history → Restore → Publish (no deploy needed).
* **Code**: deploy by git tag; to roll back `git checkout <previous-tag> && npm ci && npm run build && sudo systemctl restart the-reveal-api`. Schema changes are additive, so older code runs against newer data.
* **Data**: restore the latest good `mongodump` (see above).

## 9. Go-live checklist
- [ ] Approved arms-open photo uploaded, hotspot anchors set, "temporary photo" switched off
- [ ] All example milestones replaced/approved (no "Tusaale" badges left — Admin → Roadmaps shows the count)
- [ ] Biography fields approved by the candidate
- [ ] Somali copy reviewed by a native speaker
- [ ] `.env` production values, `COOKIE_SECURE=true`, unique `ANALYTICS_SECRET`
- [ ] MongoDB auth on, bound to localhost; backups scheduled and a restore tested
- [ ] HTTPS valid, HSTS active, `npm run test:e2e` green against staging
- [ ] Owner account created; extra editors/reviewers created with least privilege
- [ ] Privacy notice reviewed; QR code points to `https://<your-domain>/`
- [ ] Lighthouse/WebPageTest run on a mid-range Android profile; LCP/CLS/INP recorded
