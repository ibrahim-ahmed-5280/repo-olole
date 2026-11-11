#!/usr/bin/env bash
# Creates (or rotates the password of) a dedicated MongoDB user with readWrite on $REVEAL_DB ONLY,
# then writes MONGODB_URI into the protected env file.
# Does NOT change mongod.conf, does NOT enable/disable auth globally, does NOT touch other databases.
#   sudo bash deploy/vps/15-mongodb.sh
# If MongoDB requires authentication you are asked for an ADMIN username and password (password hidden).
# The account needs a role that can create users (e.g. root or userAdminAnyDatabase). Credentials are used
# once, never stored, never shown, and never placed on a command line (they are read from a 0600 temp file).
source "$(dirname "$0")/lib.sh"
need_root
command -v mongosh >/dev/null || die "mongosh not found. Install: https://www.mongodb.com/docs/mongodb-shell/install/"
[[ -f "$REVEAL_ENV_FILE" ]] || die "$REVEAL_ENV_FILE missing — run 10-prepare.sh first"

: "${MONGO_HOSTPORT:=127.0.0.1:27017}"
tmp="$(mktemp -d)"; chmod 700 "$tmp"; trap 'rm -rf "$tmp"' EXIT

redact() { sed -E 's#mongodb(\+srv)?://[^ ]*#mongodb://<redacted>#g'; }

# mongosh helper: connects as admin using credentials from 0600 files (URL-encoded inside mongosh, so any
# special characters in the password work), then runs the given JS. Never fails silently.
admin_js() {
  local js="$1"
  mongosh --nodb --quiet --eval "
    const fs = require('fs'); const rd = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    const u = rd('$tmp/admin_user'), p = rd('$tmp/admin_pass'), src = rd('$tmp/admin_src') || 'admin';
    const cred = u ? encodeURIComponent(u) + ':' + encodeURIComponent(p) + '@' : '';
    db = connect('mongodb://' + cred + '$MONGO_HOSTPORT/admin?authSource=' + encodeURIComponent(src) + '&serverSelectionTimeoutMS=5000');
    $js" 2>&1 || true
}

# 1. Admin access: anonymous first (auth disabled), otherwise ask.
# Anonymous probe: usersInfo only succeeds when authorization is disabled (listDatabases would answer ok:1, empty).
probe="$(admin_js "try { db.runCommand({usersInfo: {forAllDBs: true}}); print('ADMIN_OK') } catch (e) { print('NEEDS_AUTH ' + e.codeName) }")"
if ! grep -q ADMIN_OK <<<"$probe"; then
  if [[ -n "${MONGO_ADMIN_FILE:-}" ]]; then
    # Non-interactive: credentials saved by 12-mongodb-instance.sh (root 0600, lines user=/pass=/authdb=).
    [[ -f "$MONGO_ADMIN_FILE" ]] || die "MONGO_ADMIN_FILE $MONGO_ADMIN_FILE not found"
    admin_user="$(sed -n 's/^user=//p' "$MONGO_ADMIN_FILE")"
    admin_pass="$(sed -n 's/^pass=//p' "$MONGO_ADMIN_FILE")"
    admin_src="$(sed -n 's/^authdb=//p' "$MONGO_ADMIN_FILE")"
    info "using saved admin credentials from $MONGO_ADMIN_FILE"
  else
    info "MongoDB on $MONGO_HOSTPORT requires authentication for user management."
    read -r -p "MongoDB admin username: " admin_user
    read -r -s -p "MongoDB admin password (hidden): " admin_pass; echo
    read -r -p "Authentication database [admin]: " admin_src
  fi
  [[ -n "$admin_user" && -n "$admin_pass" ]] || die "username and password are required — nothing was changed"
  printf '%s' "$admin_user" > "$tmp/admin_user"; printf '%s' "$admin_pass" > "$tmp/admin_pass"; printf '%s' "${admin_src:-admin}" > "$tmp/admin_src"
  chmod 600 "$tmp"/admin_*; unset admin_pass
  probe="$(admin_js "
    const roles = db.runCommand({connectionStatus:1}).authInfo.authenticatedUserRoles.map(r => r.role + '@' + r.db);
    print('ROLES ' + roles.join(','));
    print(roles.some(r => /^(root|userAdminAnyDatabase|userAdmin)@/.test(r)) ? 'ADMIN_OK' : 'NOT_ADMIN')")"
  if grep -qiE 'Authentication failed|AuthenticationFailed' <<<"$probe"; then
    die "MongoDB rejected that username/password (authentication database '${admin_src:-admin}'). Nothing was changed — run this script again."
  elif grep -q NOT_ADMIN <<<"$probe"; then
    die "login OK, but this account cannot create users ($(grep '^ROLES' <<<"$probe" | cut -c7-)). Use an account with root or userAdminAnyDatabase. Nothing was changed."
  elif ! grep -q ADMIN_OK <<<"$probe"; then
    die "could not use the admin account: $(tail -3 <<<"$probe" | redact). Nothing was changed."
  fi
  ok "admin login verified ($(grep '^ROLES' <<<"$probe" | cut -c7-))"
fi

# 2. Create (or rotate) the dedicated application user.
pass="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-40)"
printf '%s' "$pass" > "$tmp/app_pass"; chmod 600 "$tmp/app_pass"
out="$(admin_js "
  const target = db.getSiblingDB('$REVEAL_DB');
  const pwd = require('fs').readFileSync('$tmp/app_pass', 'utf8');
  const roles = [{ role: 'readWrite', db: '$REVEAL_DB' }];
  if (target.getUser('$REVEAL_DB_USER')) { target.updateUser('$REVEAL_DB_USER', { pwd, roles }); print('ROTATED'); }
  else { target.createUser({ user: '$REVEAL_DB_USER', pwd, roles }); print('CREATED'); }")"
result="$(grep -oE '^(CREATED|ROTATED)$' <<<"$out" | tail -1 || true)"
[[ -n "$result" ]] || die "user creation failed: $(tail -3 <<<"$out" | redact)"
ok "MongoDB user $REVEAL_DB_USER ${result,,} with readWrite on $REVEAL_DB only"

uri="mongodb://$REVEAL_DB_USER:$pass@$MONGO_HOSTPORT/$REVEAL_DB?authSource=$REVEAL_DB"
printf '%s' "$uri" > "$tmp/app_uri"
check="$(mongosh --nodb --quiet --eval "const c = connect(require('fs').readFileSync('$tmp/app_uri','utf8')); print(c.runCommand({ping:1}).ok === 1 ? 'APP_OK' : 'NO')" 2>&1 || true)"
grep -q APP_OK <<<"$check" || die "could not connect with the new credentials: $(tail -3 <<<"$check" | redact)"
ok "connection test with the new user succeeded"

# Replace the MONGODB_URI line in the env file (value is alphanumeric-safe).
cp -a "$REVEAL_ENV_FILE" "$REVEAL_BACKUP_DIR/api.env.$(ts).bak"
awk -v line="MONGODB_URI=$uri" 'BEGIN{d=0} /^MONGODB_URI=/{print line; d=1; next} {print} END{if(!d) print line}' "$REVEAL_ENV_FILE" > "$tmp/env"
install -o root -g "$REVEAL_USER" -m 0640 "$tmp/env" "$REVEAL_ENV_FILE"
unset pass uri
ok "MONGODB_URI written to $REVEAL_ENV_FILE (previous file backed up to $REVEAL_BACKUP_DIR)"
[[ "$result" == ROTATED ]] && systemctl is-active --quiet "$REVEAL_SERVICE" && { systemctl restart "$REVEAL_SERVICE"; wait_for_health || die "service unhealthy after password rotation"; }
ok "Next: sudo bash deploy/vps/20-release.sh"
