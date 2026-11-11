# VPS inspection — BEFORE state

## Collected so far (public, read-only, from outside the server) — 2026-11-11

| Check | Result |
|---|---|
| DNS `zdu.elivateict.com` | A → `104.237.2.66` |
| HTTPS `/` | `200`, `Server: nginx`, page title **"Zakariye Digital Universe"** (old 3D site is live) |
| HTTP `/` | `301 → https://zdu.elivateict.com/` |
| Certificate | Let's Encrypt (CN `YE1` intermediate), SAN `zdu.elivateict.com` only, valid **2026-11-10 → 2027-02-08** |
| `/api/health`, `/api/v1/health` | `404` (the old app's API is not under these paths; THE REVEAL uses `/api/v1/*`) |
| SSH with the local key `myserver_key` | **refused** for `root` and `ubuntu` → server-side inspection must be run by the owner |

## Server-side findings — `00-inspect.sh` run by the owner, 2026-11-11 14:31 UTC (nothing changed)

| Area | Finding | Impact on THE REVEAL |
|---|---|---|
| OS / resources | Ubuntu 24.04.5, 4 CPUs, 6 GiB RAM (4.3 GiB available, **no swap**), 17 GB free disk | enough for `npm ci` + build (peak ≈ 1.5 GB) |
| Node / npm | system `node v22.23.4`, npm 10.9.9 (shared by other Node services) | ≥ 22.12 ✓ — **no Node install or change needed** |
| Port 4320 | **free** | used for THE REVEAL (loopback only) |
| Port 4310 | old API, listening on `*:4310`; referenced by `lattice-api.service` | never touched; publicly unreachable (ufw INPUT DROP, only 22/80/443 open) |
| Other tenants | admin.kaafiye / kaafiye.garsame.com, baroplatform, cscareer, fahanai, kingsschools, *.onepercenttech.com, fahanict.com (+www), seams.garsame.com, zakariye.elivateict.com (+www), zdu.elivateict.com | only the zdu block changes at cutover |
| zdu Nginx file | `/etc/nginx/sites-available/zdu.elivateict.com.conf` (proxies to :4310) — enabled via `sites-enabled/` symlink | cutover target; `zakariye.elivateict.com.conf` **also** uses the old API on :4310 and keeps working |
| Inspection bug | first run reported "none found" for the enabled zdu file because `grep -r` skips symlinks — fixed to `grep -R` in `00-inspect.sh` and `50-nginx-cutover.sh` (verified on real symlinks) | re-run of the inspection shows the enabled file |
| Nginx | 1.24.0 (Ubuntu), `nginx -t` OK | `listen 443 ssl http2;` syntax selected automatically |
| Certificate | `zdu.elivateict.com` only, ECDSA, valid until **2027-02-08**; renewal **webroot** `/var/www/letsencrypt-zdu`; `certbot.timer` active | reused as-is; ACME location kept in the new block |
| MongoDB | `mongod.service` on `127.0.0.1:27017` with **`authorization: enabled`** (owner does not use its admin login); also `mongod-fahanict` :27018, `mongod-lattice` :27117, Docker `kaafiye-mongo-1` | **decision:** THE REVEAL gets its own instance `mongod-the-reveal` on :27217 via `12-mongodb-instance.sh` (same pattern as the other apps); all existing instances untouched |
| Tools | mongosh 2.13.0, mongodump 100.19.1, certbot 2.9.0, git 2.43 | nothing to install |
| Old app | `/var/www/zakariye` at `a0ec5bb` | untouched |
| `reveal` user / `/srv/the-reveal` | do not exist yet | created by `10-prepare.sh` |

## Server-side inspection (owner runs, changes nothing)

```bash
git clone --depth 1 --branch feature/the-reveal https://github.com/ibrahim-ahmed-5280/repo-olole.git /tmp/the-reveal-deploy
```
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/00-inspect.sh 2>&1 | tee ~/reveal-inspection.txt
```

`00-inspect.sh` reports (sudo is used only to *read*):
- OS, kernel, uptime, RAM, disk, CPUs
- versions of node, npm, git, mongosh, mongod, mongodump, nginx, certbot, ufw
- every listening TCP port with its process, and whether 4320 / 4310 / 27017 / 80 / 443 are taken
- running services, anything referencing port 4310 or `/var/www/zakariye`, pm2 processes
- every Nginx `server_name`, the exact file(s) serving `zdu.elivateict.com` (listen/root/proxy_pass/ssl lines), other files that proxy to :4310, `nginx -t`
- certbot certificate + renewal method (authenticator, webroot) + renewal timer, and the certificate served locally
- the current site through local Nginx (status + title) and HTTP→HTTPS redirect
- MongoDB: service state, `net`/`security` sections of `/etc/mongod.conf`, Docker Mongo containers, database list (or "needs auth")
- `/var/www/*`, `/srv/*`, old app's last commit, any existing THE REVEAL install, firewall rules

## Decision checklist (fill in from the report)

| Question | Answer | Blocks? |
|---|---|---|
| OS / Node version (need ≥ 22.12 for the build) | | yes if old app needs another system Node — use an isolated runtime |
| Is port **4320** free? (else pick e.g. 4321–4399) | | yes |
| Which file serves zdu? Symlink in `sites-enabled/` or file in `conf.d/`? | | — |
| Does that file serve **only** zdu (no other `server_name`, no `default_server`)? | | yes — must be split manually first |
| Certbot authenticator for zdu (nginx / webroot / standalone)? | | standalone would need a renewal change |
| Is the old API (:4310) used by any **other** hostname? | | no — it keeps running untouched |
| MongoDB local? auth enabled? `mongosh`/`mongodump` installed? | | install tools if missing |
| Free disk ≥ 3 GB, free RAM ≥ 600 MB | | yes |
| Firewall: 80/443 open; 4320 **not** open publicly | | must stay closed |

**Services that can be affected by the cutover:** only the zdu Nginx server block. The old app (`/var/www/zakariye`, port 4310, its database and service) keeps running; it just stops receiving zdu traffic.
