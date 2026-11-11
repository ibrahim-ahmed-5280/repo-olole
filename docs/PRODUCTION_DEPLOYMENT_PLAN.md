# Production deployment plan — THE REVEAL → https://zdu.elivateict.com

> Status legend used across these docs: **Prepared** (written, syntax-checked) · **Tested locally** (ran on the developer PC) · **Tested on staging** · **Deployed** · **Verified publicly** · **Not tested**.

## What is deployed, where

| Item | Value | Notes |
|---|---|---|
| Repository / branch | `https://github.com/ibrahim-ahmed-5280/repo-olole.git` · `feature/the-reveal` | public (anonymous clone works) |
| Commit | latest verified on the branch (`77df3ec` at time of writing — newer than the originally expected `c48367e`, and contains it) | `EXPECT_SHA=<sha>` pins it |
| Service user | `reveal` (system user, no login shell) | never runs as root |
| Code | `/srv/the-reveal/releases/<commit>/` with `/srv/the-reveal/app` → active release (symlink) | old app in `/var/www/zakariye` is never touched |
| Uploads | `/srv/the-reveal/uploads` | the only path the service can write |
| Secrets | `/etc/the-reveal/api.env` (root:reveal 0640) | never in Git, logs or shell history |
| API | `127.0.0.1:4320` (loopback only) — **only if free**, otherwise any free port via `REVEAL_PORT` | never 4310 (old app) |
| Database | MongoDB `the_reveal`, user `reveal_app` with `readWrite` on `the_reveal` only | other databases untouched |
| systemd | `the-reveal-api.service` | journald logs |
| Nginx | new `the-reveal-zdu.conf` replacing **only** the zdu block, at cutover, after approval | old block kept in backup |
| Backups | `/var/backups/the-reveal/` (root 0700) | DB + uploads + env, 14 days |

Architecture in production: `Browser → Nginx :443 (TLS, /assets from disk) → Node :4320 (API, /media, SPA index.html + client-route fallback) → MongoDB the_reveal`.

## Phases

| # | Phase | Script / doc | Touches live site? | Status |
|---|---|---|---|---|
| 0 | Read-only inspection, BEFORE report | `deploy/vps/00-inspect.sh` · [VPS_INSPECTION.md](VPS_INSPECTION.md) | no | Prepared — **owner must run** (no SSH access for the assistant) |
| 1 | User, dirs, env file, repo mirror, port check | `deploy/vps/10-prepare.sh` | no | Prepared |
| 2 | Dedicated MongoDB user + URI | `deploy/vps/15-mongodb.sh` | no | Prepared |
| 3 | Build + tests in an isolated release dir | `deploy/vps/20-release.sh` | no | Prepared |
| 4 | Indexes, starter content, owner account | `deploy/vps/30-database.sh` | no | Prepared |
| 5 | systemd service on loopback port | `deploy/vps/40-activate.sh` | no | Prepared |
| 6 | Staging via SSH tunnel + smoke tests | [POST_DEPLOYMENT_VERIFICATION.md](POST_DEPLOYMENT_VERIFICATION.md) | no | Prepared · **production mode Tested locally** |
| 7 | Backups + restore check | `deploy/vps/80-backup.sh` | no | Prepared |
| 8 | Nginx dry run (sandbox `nginx -t`) | `deploy/vps/50-nginx-cutover.sh` | no | Prepared |
| 9 | **Cutover — needs owner approval** | `deploy/vps/50-nginx-cutover.sh --apply` · [NGINX_CUTOVER.md](NGINX_CUTOVER.md) | **yes** | Prepared |
| 10 | Rollback (if needed) | `deploy/vps/60-rollback.sh` · [ROLLBACK.md](ROLLBACK.md) | yes | Prepared |
| 11 | Updates later | `deploy/vps/70-update.sh` · [MAINTENANCE.md](MAINTENANCE.md) | no Nginx change | Prepared |

## Exact commands (copy & paste)

Replace `YOUR_SSH_USER` with your own VPS login (the assistant's key `myserver_key` is **not** authorised for `root` or `ubuntu`).

### A. Connect
```bash
ssh -t YOUR_SSH_USER@104.237.2.66
```

### B. Get the deployment scripts (read-only checkout in /tmp) and inspect — changes nothing
```bash
git clone --depth 1 --branch feature/the-reveal https://github.com/ibrahim-ahmed-5280/repo-olole.git /tmp/the-reveal-deploy
```
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/00-inspect.sh 2>&1 | tee ~/reveal-inspection.txt
```
Send `~/reveal-inspection.txt` for review **before continuing**. Stop if: port 4320 is in use (choose another with `REVEAL_PORT=…`), Node < 22.12, the zdu block shares a file with other hostnames, or MongoDB is not on this server.

### C. Missing dependencies (only what the inspection reported missing)
Node.js 22 LTS (official NodeSource repo — does not affect other Node apps that use their own runtime/nvm; check the inspection first if the old app uses the system `node`):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
```
MongoDB tools for backups (if `mongodump`/`mongosh` are missing; packages come from MongoDB's repo already used by `mongod`):
```bash
sudo apt-get install -y mongodb-database-tools mongodb-mongosh
```
> If the old application relies on the system `node` and a different major version, **stop** and choose an isolated runtime instead (e.g. install Node 22 under `/opt/node22` and run all steps with `PATH=/opt/node22/bin:$PATH sudo -E …`). The systemd unit records the exact node binary used.

### D–E. Service user, directories, protected env file, repository
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/10-prepare.sh
```

### F. Isolated database user (`readWrite` on `the_reveal` only)
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/15-mongodb.sh
```
If MongoDB requires authentication you are asked (hidden input) for an admin connection string; it is used once and not stored.

### G. Review the production env file (secrets stay on the server)
```bash
sudo -e /etc/the-reveal/api.env
```
See [PRODUCTION_ENVIRONMENT.md](PRODUCTION_ENVIRONMENT.md) for every variable.

### H. Build + test a release (live site untouched)
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/20-release.sh
```
Pin the exact verified commit instead:
```bash
cd /tmp/the-reveal-deploy && EXPECT_SHA=77df3ec sudo -E bash deploy/vps/20-release.sh
```

### I. Indexes, starter content and the first owner (interactive password, hidden)
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/30-database.sh <commit-sha-printed-by-step-H> <owner-username>
```

### J. Install + start the service (loopback only)
```bash
cd /tmp/the-reveal-deploy && sudo bash deploy/vps/40-activate.sh <commit-sha>
```
From now on use the scripts of the active release: `/srv/the-reveal/app/deploy/vps/…`.

### K. Health
```bash
curl -s http://127.0.0.1:4320/api/v1/health
```
```bash
systemctl status the-reveal-api --no-pager
```

### L. Staging (from YOUR computer — nothing public changes)
```bash
ssh -N -L 4320:127.0.0.1:4320 YOUR_SSH_USER@104.237.2.66
```
Then open http://localhost:4320 and http://localhost:4320/admin, and run the smoke suite from the project folder:
```bash
SMOKE_BASE_URL=http://localhost:4320 npx playwright test -c playwright.smoke.config.ts
```
Complete the PASS/FAIL table in [POST_DEPLOYMENT_VERIFICATION.md](POST_DEPLOYMENT_VERIFICATION.md).

### Backups (before cutover)
```bash
sudo bash /srv/the-reveal/app/deploy/vps/80-backup.sh --now
```
```bash
sudo bash /srv/the-reveal/app/deploy/vps/80-backup.sh --install
```

### M. Prepare + inspect the Nginx replacement (dry run, sandbox validation)
```bash
sudo bash /srv/the-reveal/app/deploy/vps/50-nginx-cutover.sh
```

### N–O. Cutover (only after staging PASS + your explicit approval)
```bash
sudo bash /srv/the-reveal/app/deploy/vps/50-nginx-cutover.sh --apply
```

### P. Public verification (from your computer)
```bash
SMOKE_BASE_URL=https://zdu.elivateict.com npx playwright test -c playwright.smoke.config.ts
```

### Q. Rollback to the old site
```bash
sudo bash /srv/the-reveal/app/deploy/vps/60-rollback.sh
```

### R. Logs
```bash
sudo journalctl -u the-reveal-api -f
```

### S. Future updates
```bash
sudo bash /srv/the-reveal/app/deploy/vps/70-update.sh
```

## Owner decisions / interactive steps
1. Provide an SSH login (or run the commands yourself) — the assistant has no VPS access.
2. Approve the port if 4320 is taken, and confirm Node/MongoDB findings from the inspection.
3. Type the MongoDB admin connection string if MongoDB uses authentication (step F).
4. Choose the owner username and type its password (step I).
5. Sign off staging (step L) and **explicitly approve the cutover** (step O, typed confirmation).
