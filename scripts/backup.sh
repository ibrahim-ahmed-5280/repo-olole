#!/usr/bin/env bash
# Daily backup of THE REVEAL: MongoDB dump + uploaded media. Keeps 14 days.
# Usage: MONGODB_URI=... UPLOAD_DIR=/srv/the-reveal/uploads BACKUP_DIR=/var/backups/the-reveal ./scripts/backup.sh
set -euo pipefail
: "${MONGODB_URI:?MONGODB_URI is required}"
UPLOAD_DIR="${UPLOAD_DIR:-/srv/the-reveal/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/the-reveal}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_DIR/db-$STAMP.gz"
tar -czf "$BACKUP_DIR/media-$STAMP.tgz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
find "$BACKUP_DIR" -type f -mtime +14 -delete
echo "Backup written: $BACKUP_DIR/db-$STAMP.gz, $BACKUP_DIR/media-$STAMP.tgz"
