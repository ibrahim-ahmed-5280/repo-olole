# Rollback

Three independent levels — none of them deletes THE REVEAL's database, uploads or the old application.

## 1. Domain back to the OLD Zakariye Digital Universe site
Restores only the zdu Nginx file(s) recorded in the cutover backup; no other tenant's file is touched, `/etc/nginx` is never restored wholesale.
```bash
sudo bash /srv/the-reveal/app/deploy/vps/60-rollback.sh
```
Specific backup:
```bash
sudo bash /srv/the-reveal/app/deploy/vps/60-rollback.sh /var/backups/the-reveal/nginx-cutover-<timestamp>
```
It asks you to type `ROLLBACK`, removes THE REVEAL's zdu file (kept in the backup), puts the old symlink/file back exactly where it was, runs `nginx -t` (if that fails it does **not** reload — the old in-memory config keeps serving), reloads Nginx and prints the restored site's status/title. `50-nginx-cutover.sh --apply` calls this automatically if post-cutover checks fail.

Manual equivalent (if the scripts are unavailable) — read `manifest` in the backup directory, then:
```bash
sudo rm /etc/nginx/sites-enabled/the-reveal-zdu.conf
```
```bash
sudo ln -s <OLD_REAL from manifest> <OLD_ENABLED from manifest>
```
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 2. THE REVEAL back to its previous release (bad update)
```bash
tail -3 /srv/the-reveal/releases.log
```
```bash
sudo bash /srv/the-reveal/app/deploy/vps/40-activate.sh <previous-commit-sha>
```
Instant (symlink switch + restart). `70-update.sh` already does this automatically when a new release fails its health check.

## 3. Data restore (THE REVEAL database / uploads)
Stop the API, restore, start:
```bash
sudo systemctl stop the-reveal-api
```
```bash
sudo bash -c 'set -a; . /etc/the-reveal/api.env; set +a; mongorestore --uri="$MONGODB_URI" --gzip --archive=/var/backups/the-reveal/data/db-<stamp>.gz --nsInclude="the_reveal.*" --drop'
```
```bash
sudo tar -xzf /var/backups/the-reveal/data/media-<stamp>.tgz -C /srv/the-reveal
```
```bash
sudo systemctl start the-reveal-api && curl -s http://127.0.0.1:4320/api/v1/health
```
`--nsInclude="the_reveal.*"` guarantees only THE REVEAL's database is restored.

## Rollback test (do once before cutover)
The dry run (`50-nginx-cutover.sh` without `--apply`) validates the new config in a sandbox. Right after a real cutover you can rehearse a full round-trip in under a minute: `60-rollback.sh` → confirm the old site → `50-nginx-cutover.sh --apply` again.
