#!/usr/bin/env bash
# Creates (or rotates the password of) a dedicated MongoDB user with readWrite on $REVEAL_DB ONLY,
# then writes MONGODB_URI into the protected env file.
# Does NOT change mongod.conf, does NOT enable/disable auth globally, does NOT touch other databases.
#   sudo bash deploy/vps/15-mongodb.sh
# If MongoDB requires authentication you will be asked (hidden input) for an admin connection string,
# e.g. mongodb://ADMIN_USER:ADMIN_PASS@127.0.0.1:27017/admin — it is used once and never stored.
source "$(dirname "$0")/lib.sh"
need_root
command -v mongosh >/dev/null || die "mongosh not found. Install: https://www.mongodb.com/docs/mongodb-shell/install/"
[[ -f "$REVEAL_ENV_FILE" ]] || die "$REVEAL_ENV_FILE missing — run 10-prepare.sh first"

: "${MONGO_HOSTPORT:=127.0.0.1:27017}"
tmp="$(mktemp -d)"; chmod 700 "$tmp"; trap 'rm -rf "$tmp"' EXIT

# Admin connection: try without credentials first (auth disabled), otherwise ask.
admin_uri="mongodb://$MONGO_HOSTPORT/admin"
if ! mongosh "$admin_uri" --quiet --eval 'db.adminCommand({listDatabases:1,nameOnly:true}).ok' 2>/dev/null | grep -q 1; then
  info "MongoDB requires authentication for user management."
  read -r -s -p "Admin connection string (input hidden): " admin_uri; echo
  [[ -n "$admin_uri" ]] || die "no admin connection string given"
fi
printf '%s' "$admin_uri" > "$tmp/admin_uri"

pass="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-40)"
cat > "$tmp/create.js" <<JS
const target = db.getSiblingDB('$REVEAL_DB');
const existing = target.getUser('$REVEAL_DB_USER');
const roles = [{ role: 'readWrite', db: '$REVEAL_DB' }];
if (existing) { target.updateUser('$REVEAL_DB_USER', { pwd: '$pass', roles }); print('ROTATED'); }
else { target.createUser({ user: '$REVEAL_DB_USER', pwd: '$pass', roles }); print('CREATED'); }
JS
chmod 600 "$tmp/create.js"
# The admin URI is read from a file inside mongosh so it never appears in the process list.
result="$(mongosh --nodb --quiet --eval "const m = connect(require('fs').readFileSync('$tmp/admin_uri','utf8')); db = m; load('$tmp/create.js')" 2>&1 | tail -1)"
[[ "$result" == CREATED || "$result" == ROTATED ]] || die "user creation failed: $result"
ok "MongoDB user $REVEAL_DB_USER ${result,,} with readWrite on $REVEAL_DB only"

uri="mongodb://$REVEAL_DB_USER:$pass@$MONGO_HOSTPORT/$REVEAL_DB?authSource=$REVEAL_DB"
printf '%s' "$uri" > "$tmp/app_uri"
mongosh --nodb --quiet --eval "const c = connect(require('fs').readFileSync('$tmp/app_uri','utf8')); printjson(c.runCommand({ping:1}).ok)" 2>&1 | tail -1 | grep -q 1 \
  || die "could not connect with the new credentials"
ok "connection test with the new user succeeded"

# Replace the MONGODB_URI line in the env file (value is alphanumeric-safe).
cp -a "$REVEAL_ENV_FILE" "$REVEAL_BACKUP_DIR/api.env.$(ts).bak"
awk -v line="MONGODB_URI=$uri" 'BEGIN{d=0} /^MONGODB_URI=/{print line; d=1; next} {print} END{if(!d) print line}' "$REVEAL_ENV_FILE" > "$tmp/env"
install -o root -g "$REVEAL_USER" -m 0640 "$tmp/env" "$REVEAL_ENV_FILE"
unset pass uri admin_uri
ok "MONGODB_URI written to $REVEAL_ENV_FILE (previous file backed up to $REVEAL_BACKUP_DIR)"
[[ "$result" == ROTATED ]] && systemctl is-active --quiet "$REVEAL_SERVICE" && { systemctl restart "$REVEAL_SERVICE"; wait_for_health || die "service unhealthy after password rotation"; }
ok "Next: sudo bash deploy/vps/20-release.sh"
