# Maintenance

## Deploy a new version
Push to `feature/the-reveal`, then on the VPS:
```bash
sudo bash /srv/the-reveal/app/deploy/vps/70-update.sh
```
It backs up, builds and tests the new commit in its own release directory, syncs indexes, switches atomically and auto-reverts if the health check fails. Nginx is not touched. A specific commit:
```bash
sudo bash /srv/the-reveal/app/deploy/vps/70-update.sh <commit-sha>
```

## Service
```bash
sudo systemctl status the-reveal-api --no-pager
```
```bash
sudo journalctl -u the-reveal-api -n 200 --no-pager
```
```bash
sudo journalctl -u the-reveal-api -f
```
```bash
sudo systemctl restart the-reveal-api
```

## Backups
Daily 02:30 UTC via `/etc/cron.d/the-reveal-backup` (log `/var/log/the-reveal-backup.log`), 14-day retention in `/var/backups/the-reveal/data`. Copy them off the server regularly (encrypted). Manual backup + archive verification:
```bash
sudo bash /srv/the-reveal/app/deploy/vps/80-backup.sh --now
```
Restore: see [ROLLBACK.md](ROLLBACK.md#3-data-restore-the-reveal-database--uploads).

## Admin accounts
Create more admins in the dashboard (Admin Security → Admin accounts). Emergency owner (CLI, interactive password):
```bash
cd /srv/the-reveal/app/apps/api && sudo -u reveal node --env-file=/etc/the-reveal/api.env dist/cli/create-admin.js --username <name> --role owner
```

## Certificate
Renewed by the existing Certbot timer; THE REVEAL's Nginx block reuses the same certificate files and ACME webroot. Check:
```bash
sudo certbot renew --dry-run --cert-name zdu.elivateict.com
```

## THE REVEAL's MongoDB instance
```bash
sudo systemctl status mongod-the-reveal --no-pager
```
```bash
sudo tail -50 /var/log/mongodb/mongod-the-reveal.log
```
Admin login for this instance (root only): `/etc/the-reveal/mongo-admin.cred`.

## Rotate the app's database password
```bash
sudo MONGO_HOSTPORT=127.0.0.1:27217 MONGO_ADMIN_FILE=/etc/the-reveal/mongo-admin.cred bash /srv/the-reveal/app/deploy/vps/15-mongodb.sh
```

## Health watch (any uptime monitor)
`GET https://zdu.elivateict.com/api/v1/health` → 200 with `"db":"up"`; 503 when MongoDB is down.

## Disk usage
Releases keep the 3 newest; uploads and backups are the only growing data:
```bash
sudo du -sh /srv/the-reveal/releases /srv/the-reveal/uploads /var/backups/the-reveal
```
