#!/usr/bin/env bash
# Creates a DEDICATED MongoDB instance for THE REVEAL (same pattern as mongod-fahanict / mongod-lattice):
#   service  mongod-the-reveal.service       port 127.0.0.1:$REVEAL_MONGO_PORT (default 27217, loopback only)
#   config   /etc/mongod-the-reveal.conf     data /var/lib/mongodb-the-reveal   log /var/log/mongodb/mongod-the-reveal.log
#   auth     authorization: enabled; first admin "reveal_admin" is created through MongoDB's localhost exception
#            with a generated password stored ONLY in $REVEAL_ENV_DIR/mongo-admin.cred (root:root 0600)
# Then runs 15-mongodb.sh against this instance to create the app user reveal_app (readWrite on the_reveal only)
# and write MONGODB_URI into the protected env file.
#
# It does NOT touch mongod.service (port 27017), its config or data, the other MongoDB instances, the old app,
# Nginx or any website. Idempotent: safe to run again.
#   sudo bash deploy/vps/12-mongodb-instance.sh
source "$(dirname "$0")/lib.sh"
need_root

PORT="$REVEAL_MONGO_PORT"
NAME="mongod-the-reveal"
CONF="/etc/$NAME.conf"
DATA="/var/lib/mongodb-the-reveal"
LOGF="/var/log/mongodb/$NAME.log"
UNIT="/etc/systemd/system/$NAME.service"
CRED="$REVEAL_ENV_DIR/mongo-admin.cred"
ADMIN_USER="reveal_admin"

MONGOD="$(command -v mongod)" || die "mongod is not installed (it is on this server per the inspection — check PATH)"
command -v mongosh >/dev/null || die "mongosh is not installed"
id mongodb &>/dev/null || die "system user 'mongodb' not found (normally created by the mongodb-org package)"
[[ -d "$REVEAL_ENV_DIR" ]] || die "run 10-prepare.sh first"
for p in 27017 27018 27117 "$OLD_APP_PORT"; do [[ "$PORT" != "$p" ]] || die "port $PORT is reserved for another service"; done

if systemctl is-active --quiet "$NAME"; then
  ok "$NAME already running on 127.0.0.1:$PORT"
else
  if port_in_use "$PORT"; then die "port $PORT is already in use by another process — choose one: REVEAL_MONGO_PORT=27xxx bash $0"; fi
  install -d -o mongodb -g mongodb -m 0750 "$DATA"
  install -d -o mongodb -g mongodb -m 0755 /var/log/mongodb
  cat > "$CONF" <<EOF
# THE REVEAL — dedicated MongoDB instance (managed by deploy/vps/12-mongodb-instance.sh)
storage:
  dbPath: $DATA
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25
systemLog:
  destination: file
  path: $LOGF
  logAppend: true
net:
  port: $PORT
  bindIp: 127.0.0.1
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
security:
  authorization: enabled
EOF
  chmod 0644 "$CONF"
  cat > "$UNIT" <<EOF
[Unit]
Description=MongoDB for THE REVEAL (127.0.0.1:$PORT)
After=network-online.target
Wants=network-online.target

[Service]
User=mongodb
Group=mongodb
ExecStart=$MONGOD --config $CONF
Restart=on-failure
RestartSec=5
LimitFSIZE=infinity
LimitCPU=infinity
LimitAS=infinity
LimitNOFILE=64000
LimitNPROC=64000
LimitMEMLOCK=infinity
TasksMax=infinity
TasksAccounting=false

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now "$NAME" >/dev/null 2>&1
  for i in $(seq 1 30); do port_in_use "$PORT" && break; sleep 1; done
  port_in_use "$PORT" || { tail -20 "$LOGF" >&2; die "$NAME did not start (log: $LOGF)"; }
  ok "started $NAME on 127.0.0.1:$PORT (data $DATA, cache 0.25 GB, auth enabled)"
fi

# First admin via the localhost exception (only possible while the instance has no users).
tmp="$(mktemp -d)"; chmod 700 "$tmp"; trap 'rm -rf "$tmp"' EXIT
if [[ -f "$CRED" ]]; then
  ok "admin credential file exists: $CRED (reused)"
else
  # With authorization enabled and NO users yet, MongoDB allows exactly one thing to an unauthenticated
  # localhost client: creating the first user. If users already exist this fails with "Unauthorized".
  admin_pass="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-40)"
  printf '%s' "$admin_pass" > "$tmp/pw"; chmod 600 "$tmp/pw"
  out="$(mongosh --nodb --quiet --eval "
    const c = connect('mongodb://127.0.0.1:$PORT/admin?serverSelectionTimeoutMS=5000');
    c.getSiblingDB('admin').createUser({ user: '$ADMIN_USER', pwd: require('fs').readFileSync('$tmp/pw','utf8'), roles: ['root'] });
    print('ADMIN_CREATED')" 2>&1 || true)"
  grep -q ADMIN_CREATED <<<"$out" || die "could not create the first admin (instance already has users but $CRED is missing?): $(tail -2 <<<"$out")"
  umask 077
  printf 'user=%s\npass=%s\nauthdb=admin\nport=%s\n' "$ADMIN_USER" "$admin_pass" "$PORT" > "$CRED"
  chown root:root "$CRED"; chmod 0600 "$CRED"
  unset admin_pass
  ok "created admin '$ADMIN_USER' on $NAME — password stored only in $CRED (root 0600)"
fi

# App user + MONGODB_URI via the tested Step-2 logic, non-interactively with the saved admin credentials.
MONGO_HOSTPORT="127.0.0.1:$PORT" MONGO_ADMIN_FILE="$CRED" bash "$SCRIPT_DIR/15-mongodb.sh"
ok "THE REVEAL has its own MongoDB: $NAME on 127.0.0.1:$PORT, database $REVEAL_DB"
