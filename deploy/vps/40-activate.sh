#!/usr/bin/env bash
# Switches /srv/the-reveal/app to a built release, (re)installs the systemd unit and restarts the API.
# Automatically switches back to the previous release if the new one is not healthy.
# Touches only THE REVEAL's service — never Nginx, never the old application.
#   sudo bash deploy/vps/40-activate.sh <release-sha>
source "$(dirname "$0")/lib.sh"
need_root
sha="${1:?usage: $0 <release-sha>}"
dir="$REVEAL_RELEASES/$sha"; [[ -f "$dir/BUILD_OK" ]] || die "release $sha is not built — run 20-release.sh"
prev="$(active_release)"

# systemd unit (re-rendered every time so path/node changes are picked up)
unit="/etc/systemd/system/$REVEAL_SERVICE.service"
rendered="$(mktemp)"
sed -e "s|@ROOT@|$REVEAL_ROOT|g" -e "s|@USER@|$REVEAL_USER|g" -e "s|@NODE@|$(node_bin)|g" \
    -e "s|@ENV_FILE@|$REVEAL_ENV_FILE|g" -e "s|@SERVICE@|$REVEAL_SERVICE|g" \
    "$dir/deploy/systemd/the-reveal-api.service.template" > "$rendered"
if ! cmp -s "$rendered" "$unit" 2>/dev/null; then
  install -m 0644 "$rendered" "$unit"; systemctl daemon-reload; ok "installed $unit"
fi
rm -f "$rendered"

switch_to() { ln -sfn "$REVEAL_RELEASES/$1" "$REVEAL_APP.tmp" && mv -Tf "$REVEAL_APP.tmp" "$REVEAL_APP"; chown -h "$REVEAL_USER:$REVEAL_USER" "$REVEAL_APP"; }

switch_to "$sha"
systemctl enable "$REVEAL_SERVICE" >/dev/null 2>&1
systemctl restart "$REVEAL_SERVICE"
if wait_for_health && curl -fsS --max-time 5 "http://127.0.0.1:$REVEAL_PORT/" | grep -q '<div id="root">'; then
  echo "$(date -u +%FT%TZ) activated $sha (previous: ${prev:-none})" >> "$REVEAL_ROOT/releases.log"
  ok "release $sha is live on 127.0.0.1:$REVEAL_PORT"
else
  journalctl -u "$REVEAL_SERVICE" -n 40 --no-pager >&2
  if [[ -n "$prev" && "$prev" != "$sha" ]]; then
    warn "new release unhealthy — switching back to $prev"
    switch_to "$prev"; systemctl restart "$REVEAL_SERVICE"
    wait_for_health && warn "previous release $prev restored" || warn "previous release ALSO unhealthy — check journalctl"
  fi
  die "activation of $sha failed"
fi

# Keep the 3 most recent releases plus the active one.
ls -1dt "$REVEAL_RELEASES"/*/ 2>/dev/null | tail -n +4 | while read -r old; do
  [[ "$(basename "$old")" == "$sha" ]] && continue
  rm -rf "$old"; info "pruned old release $(basename "$old")"
done
