# Production environment

File: `/etc/the-reveal/api.env` — owner `root`, group `reveal`, mode `0640`. Created by `deploy/vps/10-prepare.sh` from `deploy/env/production.env.template`; `MONGODB_URI` is filled by `deploy/vps/15-mongodb.sh`. Each release links `.env → /etc/the-reveal/api.env` so the Vite build can read the public `VITE_*` values (Vite only exposes `VITE_`-prefixed variables to the bundle — secrets never reach the browser). The systemd unit loads the same file with `node --env-file`.

| Variable | Production value | Why |
|---|---|---|
| `NODE_ENV` | `production` | enables production guards (below), HSTS, safe errors |
| `HOST` | `127.0.0.1` | API never listens publicly |
| `PORT` | `4320` (or another verified-free port) | not 4310 (old app) |
| `MONGODB_URI` | `mongodb://reveal_app:<generated>@127.0.0.1:27217/the_reveal?authSource=the_reveal` | dedicated instance `mongod-the-reveal` (27217) and dedicated user, `readWrite` on `the_reveal` only |
| `PUBLIC_ORIGIN` | `https://zdu.elivateict.com` | canonical/sitemap/robots; **must be https** in production |
| `ALLOWED_ORIGINS` | `https://zdu.elivateict.com,http://localhost:4320` during staging → `https://zdu.elivateict.com` after cutover (removed automatically) | CORS + Origin check on mutations |
| `ANALYTICS_SECRET` | 64 random chars (generated) | daily-rotating session hashing |
| `COOKIE_SECURE` | `true` | required in production |
| `TRUST_PROXY` | `1` | real client IP for rate limiting behind Nginx |
| `SESSION_TTL_HOURS` / `SESSION_IDLE_MINUTES` | `12` / `120` | admin sessions |
| `UPLOAD_DIR` | `/srv/the-reveal/uploads` | **must be absolute** in production |
| `MAX_UPLOAD_MB` | `8` | Nginx allows 10 MB bodies |
| `*_RETENTION_DAYS` | feedback 365 · audit 730 · analytics 730 | data minimisation |
| `LOG_LEVEL` | `info` | journald |
| `SERVE_WEB` / `WEB_DIST_DIR` | `true` / `/srv/the-reveal/app/apps/web/dist` | Node serves index.html + SPA fallback; Nginx serves `/assets` |
| `VITE_API_BASE` | `/api/v1` | same-origin API (build time) |
| `VITE_SITE_URL` | `https://zdu.elivateict.com` | canonical + Open Graph baked into `index.html` (build time) |

## Guards enforced at startup (`apps/api/src/config/env.ts`, tested in `apps/api/test/config.test.ts`)
The API refuses to start in production if `COOKIE_SECURE` is not true, `ANALYTICS_SECRET` is a placeholder, `RATE_LIMIT_DISABLED` is set, `PUBLIC_ORIGIN` is not `https://…`, `UPLOAD_DIR` is relative, or `MONGODB_URI` is missing.

## Localhost references (audited)
All remaining `localhost`/`127.0.0.1` references are legitimate: development defaults in `.env.example` and `env.ts`, the Vite dev proxy (`vite.config.ts`, dev only), test fixtures (`apps/api/test`, `playwright.config.ts`) and the loopback-only API address. The production bundle is checked by `20-release.sh` and the smoke tests to contain **no** `localhost:4000`, `127.0.0.1:4000` or `localhost:5173`. Cookies have no `Domain` attribute (host-only), session cookie path `/api`. Share links use `window.location`, media URLs are relative (`/media/…`), robots/sitemap use `PUBLIC_ORIGIN`.

## Changing a value
```bash
sudo -e /etc/the-reveal/api.env
```
```bash
sudo systemctl restart the-reveal-api && curl -s http://127.0.0.1:4320/api/v1/health
```
`VITE_*` changes need a rebuild: `sudo bash /srv/the-reveal/app/deploy/vps/70-update.sh`.
