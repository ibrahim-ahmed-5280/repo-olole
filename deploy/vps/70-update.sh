#!/usr/bin/env bash
# Deploys a newer commit of feature/the-reveal: backup → build+test in a new release dir → atomic switch.
# If anything fails before the switch, the live site is untouched; if the new release is unhealthy,
# 40-activate.sh switches back automatically. Nginx is not touched.
#   sudo bash deploy/vps/70-update.sh                 # latest commit on the branch
#   sudo bash deploy/vps/70-update.sh <commit-sha>    # specific commit
source "$(dirname "$0")/lib.sh"
need_root
prev="$(active_release)"; [[ -n "$prev" ]] || die "nothing is deployed yet — follow docs/PRODUCTION_DEPLOYMENT_PLAN.md"

bash "$SCRIPT_DIR/80-backup.sh" --now
sha="$(bash "$SCRIPT_DIR/20-release.sh" "${1:-}" | tee /dev/stderr | tail -1)"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die "release build did not return a commit"
[[ "$sha" == "$prev" ]] && { ok "already running $sha — nothing to do"; exit 0; }
# New indexes (if any) are created before the switch; seeding is idempotent and never overwrites edits.
as_reveal bash -c "cd '$REVEAL_RELEASES/$sha/apps/api' && '$(node_bin)' --env-file='$REVEAL_ENV_FILE' dist/cli/init-db.js" >/dev/null
# Content migration: idempotent, never overwrites editor changes (see apps/api/src/seed/migrate.ts).
as_reveal bash -c "cd '$REVEAL_RELEASES/$sha/apps/api' && '$(node_bin)' --env-file='$REVEAL_ENV_FILE' dist/cli/migrate.js"
bash "$SCRIPT_DIR/40-activate.sh" "$sha"
curl -fsS --max-time 10 "https://$REVEAL_DOMAIN/api/v1/health" | grep -q '"db":"up"' \
  && ok "public site healthy on https://$REVEAL_DOMAIN (now $sha, previously $prev)" \
  || warn "public health check failed — if needed: sudo bash deploy/vps/40-activate.sh $prev"
