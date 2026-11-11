#!/usr/bin/env bash
# One-time preparation (idempotent): service user, directories, protected env file, port check.
# Does NOT touch Nginx, the old app, or any other database.
#   sudo bash deploy/vps/10-prepare.sh
source "$(dirname "$0")/lib.sh"
need_root

[[ "$REVEAL_PORT" != "$OLD_APP_PORT" ]] || die "REVEAL_PORT must not be $OLD_APP_PORT (old application)."
if port_in_use "$REVEAL_PORT"; then
  owner="$(ss -Hltnp "sport = :$REVEAL_PORT" | grep -o 'users:(("[^"]*' | cut -d'"' -f2)"
  [[ "$owner" == node && "$(systemctl is-active "$REVEAL_SERVICE" 2>/dev/null)" == active ]] \
    && info "port $REVEAL_PORT is used by $REVEAL_SERVICE itself (re-run) — ok" \
    || die "port $REVEAL_PORT is already in use by '${owner:-unknown}'. Pick a free one: REVEAL_PORT=43xx sudo -E bash $0"
else
  ok "port $REVEAL_PORT is free"
fi
check_node_version
command -v git >/dev/null || die "git is not installed (apt-get install -y git)"

# 1. Dedicated system user (no login shell, no password)
if id "$REVEAL_USER" &>/dev/null; then ok "user $REVEAL_USER exists"; else
  useradd --system --home-dir "$REVEAL_ROOT" --shell /usr/sbin/nologin --user-group "$REVEAL_USER"
  ok "created system user $REVEAL_USER"
fi

# 2. Directories (world-readable so nginx can serve /assets; uploads writable only by the service)
install -d -o "$REVEAL_USER" -g "$REVEAL_USER" -m 0755 "$REVEAL_ROOT" "$REVEAL_RELEASES"
install -d -o "$REVEAL_USER" -g "$REVEAL_USER" -m 0755 "$REVEAL_UPLOADS"
install -d -o root -g "$REVEAL_USER" -m 0750 "$REVEAL_ENV_DIR"
install -d -o root -g root -m 0700 "$REVEAL_BACKUP_DIR"
ok "directories under $REVEAL_ROOT, $REVEAL_ENV_DIR, $REVEAL_BACKUP_DIR"

# 3. Protected environment file (created once; never overwritten)
if [[ -f "$REVEAL_ENV_FILE" ]]; then
  ok "env file exists: $REVEAL_ENV_FILE (left unchanged)"
else
  secret="$(openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-64)"
  umask 027
  sed -e "s|@DOMAIN@|$REVEAL_DOMAIN|g" -e "s|@PORT@|$REVEAL_PORT|g" -e "s|@UPLOADS@|$REVEAL_UPLOADS|g" \
      -e "s|@APP@|$REVEAL_APP|g" -e "s|@DB@|$REVEAL_DB|g" -e "s|@ANALYTICS_SECRET@|$secret|g" \
      "$SCRIPT_DIR/../env/production.env.template" > "$REVEAL_ENV_FILE"
  chown root:"$REVEAL_USER" "$REVEAL_ENV_FILE"; chmod 0640 "$REVEAL_ENV_FILE"
  unset secret
  ok "created $REVEAL_ENV_FILE (root:$REVEAL_USER 0640) with a generated ANALYTICS_SECRET"
  warn "MONGODB_URI still has a placeholder — run: sudo bash deploy/vps/15-mongodb.sh"
fi

# 4. Bare mirror of the repository (releases are checked out from it)
if [[ -d "$REVEAL_REPO_CACHE" ]]; then
  as_reveal git -C "$REVEAL_REPO_CACHE" fetch --prune origin "+refs/heads/*:refs/heads/*" >/dev/null
  ok "repository mirror updated"
else
  as_reveal git clone --mirror "$REVEAL_REPO" "$REVEAL_REPO_CACHE" >/dev/null
  ok "cloned $REVEAL_REPO (mirror)"
fi
info "branch $REVEAL_BRANCH is at $(as_reveal git -C "$REVEAL_REPO_CACHE" rev-parse "refs/heads/$REVEAL_BRANCH")"
ok "preparation complete. Next: sudo bash deploy/vps/15-mongodb.sh"
