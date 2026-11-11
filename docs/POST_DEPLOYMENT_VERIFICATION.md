# Verification — staging and public

## How staging works (no public changes)
THE REVEAL runs on `127.0.0.1:4320` on the VPS with its own API and database. You reach it through an SSH tunnel from your computer — no DNS records, no Nginx changes, no exposed port:
```bash
ssh -N -L 4320:127.0.0.1:4320 YOUR_SSH_USER@104.237.2.66
```
Open http://localhost:4320 (site) and http://localhost:4320/admin. `ALLOWED_ORIGINS` contains `http://localhost:4320` until cutover. Secure cookies work on `http://localhost` because browsers treat localhost as a secure context (verified: Edge/Chromium).

## Automated smoke suite (read-only)
```bash
SMOKE_BASE_URL=http://localhost:4320 npx playwright test -c playwright.smoke.config.ts
```
After cutover:
```bash
SMOKE_BASE_URL=https://zdu.elivateict.com npx playwright test -c playwright.smoke.config.ts
```
Optional single write test (submits one feedback labelled "[deployment smoke test …] please hide" — hide it afterwards in Admin → Feedback):
```bash
SMOKE_WRITE=1 SMOKE_BASE_URL=http://localhost:4320 npx playwright test -c playwright.smoke.config.ts -g feedback
```

## PASS/FAIL report

| # | Check | How | Local production mode (2026-11-11) | Staging | Public |
|---|---|---|---|---|---|
| 1 | Landing page | smoke 1–4 | PASS | | |
| 2 | Intro animation (top → centre) | smoke 1–4 + E2E | PASS | | |
| 3 | Large centred portrait | smoke 1–4 | PASS | | |
| 4 | Reveal button → /vision | smoke 1–4 | PASS | | |
| 5 | Vision page | smoke 5–6 | PASS | | |
| 6 | Interactive hands | smoke 5–6 | PASS | | |
| 7 | Waxbarasho roadmap | smoke 7–9 | PASS | | |
| 8 | Midnimo roadmap | smoke 7–9 | PASS | | |
| 9 | Hoggaan roadmap | smoke 7–9 | PASS | | |
| 10 | About panel | smoke 10 | PASS | | |
| 11 | Feedback submission | SMOKE_WRITE=1 / manual | covered by E2E (dev) | | |
| 12 | MongoDB persistence | feedback appears in Admin → Feedback | covered by E2E (dev) | | |
| 13 | Admin login | manual (owner) | PASS | | |
| 14 | Admin dashboard | manual | PASS | | |
| 15 | Content editing | manual: edit a milestone draft, Preview | covered by E2E (dev) | | |
| 16 | Content publishing | manual: Publish → public page shows it | covered by E2E (dev) | | |
| 17 | Media upload | manual: Admin → Media → upload a JPEG | covered by API tests | | |
| 18 | Analytics charts | manual | PASS | | |
| 19 | Mobile responsive | smoke @mobile | PASS | | |
| 20 | Accessibility (axe) | smoke 20 | PASS | | |
| 21 | Refresh nested URLs | smoke 21 | PASS | | |
| 22 | Secure cookies | DevTools → Application → Cookies after login: `reveal_sid` Secure, HttpOnly, SameSite=Strict, Path=/api | PASS | | |
| 23 | No console errors | smoke (1–4, 7–9) | PASS | | |
| 24 | API health | smoke 24 | PASS | | |
| — | Security headers, JSON 404 for /api, robots/sitemap origin, no dev origins in bundle, canonical URL | smoke | PASS | | |

"Local production mode" = the built app run on the developer PC with `NODE_ENV=production`, `SERVE_WEB=true`, `COOKIE_SECURE=true`, `PUBLIC_ORIGIN=https://zdu.elivateict.com` on port 4320 — the same configuration staging uses. It is **not** a substitute for staging on the VPS.

## Public checks after cutover (in addition to the smoke suite)
- `https://zdu.elivateict.com/admin` → sign in as owner → edit a draft → Preview → Publish → public page updated → Feedback inbox → Analytics → Media → Sign out
- Certificate/redirect/health commands in [NGINX_CUTOVER.md](NGINX_CUTOVER.md#https-checks-after-cutover)
- Other tenants: `tenants.diff` in the cutover backup is empty
- Real phones: open the site on one Android and one iPhone (Safari) — not automatable here
