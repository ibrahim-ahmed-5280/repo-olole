#!/usr/bin/env bash
# THE REVEAL backups: MongoDB ($REVEAL_DB only) + uploaded media + env file copy. Keeps 14 days.
#   sudo bash deploy/vps/80-backup.sh --now        # one backup now, then verify the archive is restorable
#   sudo bash deploy/vps/80-backup.sh --install    # daily 02:30 UTC cron job (/etc/cron.d/the-reveal-backup)
#   sudo bash deploy/vps/80-backup.sh --verify <db-archive.gz>
source "$(dirname "$0")/lib.sh"
need_root
dest="$REVEAL_BACKUP_DIR/data"; install -d -m 0700 "$dest"

mongo_uri() { grep -E '^MONGODB_URI=' "$REVEAL_ENV_FILE" | cut -d= -f2-; }

verify_archive() {
  command -v mongorestore >/dev/null || die "mongorestore (mongodb-database-tools) not installed"
  # --dryRun reads and decodes the whole archive without writing anything.
  mongorestore --gzip --archive="$1" --dryRun --nsInclude="$REVEAL_DB.*" >/dev/null 2>"$1.verify.log" \
    && ok "archive is readable and restorable: $1" || { cat "$1.verify.log" >&2; die "archive verification FAILED: $1"; }
}

case "${1:-}" in
  --now)
    command -v mongodump >/dev/null || die "mongodump not installed (apt-get install -y mongodb-database-tools)"
    stamp="$(ts)"
    uri="$(mongo_uri)"; [[ "$uri" == *REPLACE_ME* ]] && die "MONGODB_URI not configured"
    printf 'uri: %s\n' "$uri" > "$dest/.cfg-$stamp"; chmod 600 "$dest/.cfg-$stamp"   # avoids the password in ps output
    mongodump --config="$dest/.cfg-$stamp" --gzip --archive="$dest/db-$stamp.gz" --quiet; rm -f "$dest/.cfg-$stamp"
    tar -czf "$dest/media-$stamp.tgz" -C "$REVEAL_ROOT" "$(basename "$REVEAL_UPLOADS")"
    cp -a "$REVEAL_ENV_FILE" "$dest/api.env-$stamp"; chmod 600 "$dest/api.env-$stamp"
    echo "$(active_release)" > "$dest/release-$stamp.txt"
    find "$dest" -type f -mtime +14 -delete
    ok "backup written: $dest/{db,media,api.env,release}-$stamp"
    verify_archive "$dest/db-$stamp.gz"
    ;;
  --install)
    cat > /etc/cron.d/the-reveal-backup <<EOF
# THE REVEAL — daily backup (database $REVEAL_DB + uploads), 14-day retention. Managed by deploy/vps/80-backup.sh
30 2 * * * root /bin/bash $REVEAL_APP/deploy/vps/80-backup.sh --now >> /var/log/the-reveal-backup.log 2>&1
EOF
    chmod 0644 /etc/cron.d/the-reveal-backup
    ok "installed /etc/cron.d/the-reveal-backup (daily 02:30 UTC, log: /var/log/the-reveal-backup.log)"
    ;;
  --verify) verify_archive "${2:?archive path}" ;;
  *) die "usage: $0 --now | --install | --verify <archive>" ;;
esac
