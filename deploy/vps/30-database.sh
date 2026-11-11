#!/usr/bin/env bash
# Initialises THE REVEAL's own database ($REVEAL_DB): indexes, starter content (once), first owner account.
# Uses the compiled CLIs of a built release and the protected env file. Touches no other database.
#   sudo bash deploy/vps/30-database.sh <release-sha> [owner-username]
# The owner password is typed interactively (hidden) — run this over `ssh -t`. It never appears in
# shell history, process lists, logs or Git.
source "$(dirname "$0")/lib.sh"
need_root
sha="${1:-$(active_release)}"; [[ -n "$sha" ]] || die "usage: $0 <release-sha> [owner-username]"
dir="$REVEAL_RELEASES/$sha"; [[ -f "$dir/BUILD_OK" ]] || die "release $sha is not built — run 20-release.sh"
owner="${2:-}"
node="$(node_bin)"
cli() { as_reveal bash -c "cd '$dir/apps/api' && '$node' --env-file='$REVEAL_ENV_FILE' dist/cli/$1.js ${2:-}"; }

info "creating/syncing indexes on $REVEAL_DB"
cli init-db
info "seeding starter content if missing (idempotent; never overwrites edits)"
cli seed
ok "database ready"

if [[ -n "$owner" ]]; then
  [[ -t 0 ]] || die "owner creation needs an interactive terminal (ssh -t …)"
  info "creating owner '$owner' — you will be asked for the password twice (min 12 chars, upper+lower+digit)"
  as_reveal bash -c "cd '$dir/apps/api' && '$node' --env-file='$REVEAL_ENV_FILE' dist/cli/create-admin.js --username \"\$0\" --role owner" "$owner"
else
  info "no owner username given — to create the first owner later:"
  echo "  sudo bash deploy/vps/30-database.sh $sha <owner-username>"
fi
