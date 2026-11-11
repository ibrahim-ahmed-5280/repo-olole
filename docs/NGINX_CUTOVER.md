# Nginx cutover — zdu.elivateict.com → THE REVEAL

**Requires:** staging PASS ([POST_DEPLOYMENT_VERIFICATION.md](POST_DEPLOYMENT_VERIFICATION.md)), a fresh backup, and the owner's explicit approval.

## What `deploy/vps/50-nginx-cutover.sh` does

1. **Preconditions** — `the-reveal-api` running and healthy on loopback; current `nginx -t` passes.
2. **Finds the zdu block** — the single file in `sites-enabled/` or `conf.d/` whose `server_name` contains `zdu.elivateict.com`. **Refuses** if there are zero or several, if that file also serves other hostnames, or if it holds a `default_server` (replacing it would change other tenants' catch-all behaviour).
3. **Reuses, never re-issues** — the existing `ssl_certificate`/`ssl_certificate_key`, Certbot's `options-ssl-nginx.conf`/`ssl_dhparam` includes, and the ACME webroot (if renewals use webroot). Verifies the certificate covers zdu and warns if it expires within 7 days. IPv6 `listen` lines only if the old block had them. `http2` syntax chosen by Nginx version.
4. **Renders** `deploy/nginx/the-reveal-zdu.conf.template`:
   - `:80` → 301 to HTTPS (+ ACME location if needed)
   - `:443` → `/assets/` from `/srv/the-reveal/app/apps/web/dist/assets/` (immutable cache), edge rate limits on `/api/v1/feedback` and `/api/v1/admin/auth/login`, everything else proxied to `127.0.0.1:4320` (API, `/media`, robots/sitemap, SPA routes like `/vision`, `/roadmap/*`, `/admin/*`). The API returns JSON 404s for unknown `/api/*` — never `index.html`.
   - `client_max_body_size 10m`, gzip, `access_log off` (privacy), uniquely-named zones/upstream (`the_reveal_*`).
5. **Validates in a sandbox** — copies `/etc/nginx` to a temp dir, swaps the zdu file there, runs `nginx -t -c <copy>`. The live config is untouched. Rendered file kept in `/var/backups/the-reveal/cutover-preview-<ts>/`.
6. **Dry run stops here** (default).
7. **`--apply`** — asks you to type `CUTOVER zdu.elivateict.com`, then:
   - backs up the old zdu file, a full `nginx -T` dump and every other hostname's HTTPS status to `/var/backups/the-reveal/nginx-cutover-<ts>/` (+ `manifest`)
   - installs `/etc/nginx/snippets/the-reveal-proxy.conf` and the new site file; disables the old one (symlink removed, or file moved into the backup — never deleted)
   - `nginx -t` → `systemctl reload nginx` (reload, not restart: no dropped connections)
   - verifies via local Nginx: `/api/v1/health` (db up), `/`, `/roadmap/midnimo` (SPA fallback), HTTP→HTTPS 301
   - **any failure → automatic rollback** with `60-rollback.sh`
   - compares every other hostname's status before/after and prints any difference
   - removes the staging origin `http://localhost:4320` from `ALLOWED_ORIGINS` and restarts the API

## Commands
Dry run (safe, any time):
```bash
sudo bash /srv/the-reveal/app/deploy/vps/50-nginx-cutover.sh
```
```bash
sudo less /var/backups/the-reveal/cutover-preview-*/the-reveal-zdu.conf
```
Cutover (after approval):
```bash
sudo bash /srv/the-reveal/app/deploy/vps/50-nginx-cutover.sh --apply
```
Then from your computer:
```bash
SMOKE_BASE_URL=https://zdu.elivateict.com npx playwright test -c playwright.smoke.config.ts
```

## HTTPS checks after cutover
```bash
echo | openssl s_client -connect zdu.elivateict.com:443 -servername zdu.elivateict.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```
```bash
curl -sI http://zdu.elivateict.com/ | head -3
```
```bash
curl -s https://zdu.elivateict.com/api/v1/health
```
```bash
sudo certbot renew --dry-run --cert-name zdu.elivateict.com
```
Expected: subject/SAN `zdu.elivateict.com`, Let's Encrypt issuer, not expired; `301` to `https://`; `{"ok":true,"data":{"status":"ok","db":"up",…}}`; renewal dry run succeeds. Mixed content is impossible by construction (same-origin `/api/v1` + relative `/media`, CSP `default-src 'self'`).

## If the script refuses
- **Shared file / default_server**: split the zdu `server { … }` blocks into their own file by hand (copy, `nginx -t`, reload, confirm the old site still works), then re-run the dry run.
- **No certificate covering zdu**: obtain it with the existing Certbot workflow for this one name (`sudo certbot certonly --nginx -d zdu.elivateict.com` if the nginx authenticator is used), then re-run.
