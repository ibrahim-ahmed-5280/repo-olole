#!/usr/bin/env bash
# Restores the PREVIOUS zdu.elivateict.com site (the old Zakariye Digital Universe block) from a cutover backup.
# Touches ONLY the zdu server block files recorded in the backup manifest. THE REVEAL's service, database and
# uploads are left intact, so a later re-cutover is instant.
#   sudo bash deploy/vps/60-rollback.sh                       # uses the most recent cutover backup
#   sudo bash deploy/vps/60-rollback.sh /var/backups/the-reveal/nginx-cutover-<timestamp>
source "$(dirname "$0")/lib.sh"
need_root
bk="${1:-$(ls -1dt "$REVEAL_BACKUP_DIR"/nginx-cutover-* 2>/dev/null | head -1 || true)}"
[[ -n "$bk" && -f "$bk/manifest" ]] || die "no cutover backup found (expected $REVEAL_BACKUP_DIR/nginx-cutover-*/manifest)"
# shellcheck disable=SC1091
source "$bk/manifest"
info "restoring from $bk (cutover of $CREATED_AT)"

if [[ -z "${REVEAL_ROLLBACK_NONINTERACTIVE:-}" ]]; then
  read -r -p "Type  ROLLBACK  to restore the previous $REVEAL_DOMAIN site: " answer
  [[ "$answer" == ROLLBACK ]] || die "not confirmed — nothing changed"
fi

# 1. disable THE REVEAL's zdu block (kept in the backup for a later re-cutover)
[[ -e "$NEW_ENABLED" || -L "$NEW_ENABLED" ]] && { cp -aL "$NEW_ENABLED" "$bk/the-reveal-zdu.conf.disabled" 2>/dev/null || true; rm -f "$NEW_ENABLED"; }
[[ -n "$NEW_AVAILABLE" && -f "$NEW_AVAILABLE" ]] && mv "$NEW_AVAILABLE" "$bk/the-reveal-zdu.conf.available"

# 2. restore the old block exactly as it was
if (( OLD_IS_LINK )); then
  [[ -f "$OLD_REAL" ]] || cp -a "$bk/old-zdu.conf" "$OLD_REAL"
  ln -sfn "$OLD_REAL" "$OLD_ENABLED"
else
  if [[ -f "$bk/old-enabled-file" ]]; then mv "$bk/old-enabled-file" "$OLD_ENABLED"; else cp -a "$bk/old-zdu.conf" "$OLD_ENABLED"; fi
fi

if ! nginx -t 2>"$bk/nginx-t-rollback.txt"; then
  cat "$bk/nginx-t-rollback.txt" >&2
  die "nginx -t failed after restoring — the live nginx was NOT reloaded (still serving the previous in-memory config). Inspect $bk."
fi
systemctl reload nginx
sleep 2
code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/" || true)"
title="$(curl -sk --max-time 10 --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/" | grep -oiE '<title>[^<]*</title>' | head -1 || true)"
ok "previous site restored: HTTPS $code ${title}"
info "THE REVEAL keeps running on 127.0.0.1:$REVEAL_PORT (database and uploads untouched)."
