#!/usr/bin/env bash
# Creates a DEDICATED MongoDB instance for THE REVEAL (same pattern as mongod-fahanict / mongod-lattice):
#   service  mongod-the-reveal.service       listens ONLY on 127.0.0.1:$REVEAL_MONGO_PORT (default 27217)
#   config   /etc/mongod-the-reveal.conf     data /var/lib/mongodb-the-reveal   log /var/log/mongodb/mongod-the-reveal.log
#   auth     authorization: enabled; first admin "reveal_admin" is created through MongoDB's localhost exception
#            with a generated password stored ONLY in $REVEAL_ENV_DIR/mongo-admin.cred (root:root 0600)
# Then runs 15-mongodb.sh against this instance to create the app user reveal_app (readWrite on the_reveal only)
# and write MONGODB_URI into the protected env file.
#
# Phases:  1) PRE-FLIGHT — creates nothing permanent: port free + not used in any mongod config, names/paths free,
#             disk space, unit validated with systemd-analyze, MongoDB config proven with a throwaway sandbox start
#          2) INSTALL — only after every pre-flight check passed
#          3) VERIFY — new instance bound to 127.0.0.1 only and auth enforced; the existing instances
#             (27017, 27018, 27117) still listening with the SAME process IDs as before
#
# It does NOT touch mongod.service / mongod-fahanict / mongod-lattice, their configs or data, Docker, the old app,
# Nginx, port 4310 or any website. Idempotent: if mongod-the-reveal is already installed it only (re)verifies.
#   sudo bash deploy/vps/12-mongodb-instance.sh            # pre-flight + install + verify
#   sudo bash deploy/vps/12-mongodb-instance.sh --check    # pre-flight only (changes nothing)
source "$(dirname "$0")/lib.sh"
need_root
CHECK_ONLY=0; [[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

PORT="$REVEAL_MONGO_PORT"
NAME="mongod-the-reveal"
CONF="/etc/$NAME.conf"
DATA="/var/lib/mongodb-the-reveal"
LOGF="/var/log/mongodb/$NAME.log"
UNIT="/etc/systemd/system/$NAME.service"
CRED="$REVEAL_ENV_DIR/mongo-admin.cred"
ADMIN_USER="reveal_admin"
: "${MIN_FREE_GB:=2}"
PROTECTED_PORTS=(27017 27018 27117)   # existing MongoDB instances on this server — must never change

tmp="$(mktemp -d)"; chmod 755 "$tmp"; trap 'cleanup_sandbox; rm -rf "$tmp"' EXIT
sandbox_pid=""
cleanup_sandbox() { [[ -n "$sandbox_pid" ]] && kill "$sandbox_pid" 2>/dev/null && wait "$sandbox_pid" 2>/dev/null; sandbox_pid=""; true; }

listener_pid() { ss -Hltnp "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2; }

write_conf() {  # $1 dbPath  $2 logPath  $3 port
  cat <<EOF
# THE REVEAL — dedicated MongoDB instance (managed by deploy/vps/12-mongodb-instance.sh)
storage:
  dbPath: $1
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25
systemLog:
  destination: file
  path: $2
  logAppend: true
net:
  port: $3
  bindIp: 127.0.0.1
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
security:
  authorization: enabled
EOF
}

write_unit() {
  cat <<EOF
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
}

# Snapshot of the protected instances (port → pid) to prove later that nothing changed.
declare -A BEFORE
for p in "${PROTECTED_PORTS[@]}"; do BEFORE[$p]="$(listener_pid "$p")"; done

# ════════════════════════════ 1. PRE-FLIGHT (nothing permanent is created) ════════════════════════════
MONGOD="$(command -v mongod)" || die "mongod is not installed"
command -v mongosh >/dev/null || die "mongosh is not installed"
id mongodb &>/dev/null || die "system user 'mongodb' not found (normally created by the mongodb-org package)"
[[ -d "$REVEAL_ENV_DIR" ]] || die "run 10-prepare.sh first"
ok "tools: $("$MONGOD" --version 2>&1 | sed -n 1p), mongosh $(mongosh --version 2>&1 | sed -n 1p)"

already=0
if [[ -f "$UNIT" ]] && grep -q 'managed by deploy/vps/12-mongodb-instance.sh\|MongoDB for THE REVEAL' "$UNIT" "$CONF" 2>/dev/null; then
  already=1; ok "$NAME is already installed — skipping install, re-verifying only"
fi

if (( ! already )); then
  for p in "${PROTECTED_PORTS[@]}" "$OLD_APP_PORT" "$REVEAL_PORT"; do [[ "$PORT" != "$p" ]] || die "port $PORT is reserved for another service"; done
  port_in_use "$PORT" && die "port $PORT is already in use (by: $(ss -Hltnp "sport = :$PORT" | grep -o 'users:(("[^"]*' | cut -d'"' -f2)) — choose another: REVEAL_MONGO_PORT=27xxx bash $0"
  ok "port $PORT is free"
  if grep -lE "^\s*port:\s*$PORT\b" /etc/mongod*.conf 2>/dev/null | grep -v "^$CONF$"; then die "port $PORT is configured in an existing mongod config (above) — choose another port"; fi
  ok "port $PORT is not configured in any existing /etc/mongod*.conf"
  [[ ! -e "$UNIT" ]] || die "$UNIT already exists and is not managed by this script — refusing to overwrite"
  [[ ! -e "$CONF" ]] || die "$CONF already exists and is not managed by this script — refusing to overwrite"
  if [[ -d "$DATA" && -n "$(ls -A "$DATA" 2>/dev/null)" ]]; then die "$DATA exists and is not empty — refusing to reuse another dataset"; fi
  systemctl list-unit-files "$NAME.service" --no-legend 2>/dev/null | grep -q . && die "a unit named $NAME already exists"
  ok "service name, config path and data directory are free"

  probe_dir="/var/lib"; avail_kb="$(df --output=avail -k "$probe_dir" | tail -1 | tr -d ' ')"
  (( avail_kb >= MIN_FREE_GB * 1024 * 1024 )) || die "only $((avail_kb / 1024 / 1024)) GB free on $probe_dir — need ≥ ${MIN_FREE_GB} GB"
  ok "disk: $((avail_kb / 1024 / 1024)) GB free on $probe_dir (need ≥ ${MIN_FREE_GB} GB)"
  avail_mem_mb="$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)"
  (( avail_mem_mb >= 512 )) || die "only ${avail_mem_mb} MB RAM available — need ≥ 512 MB"
  ok "memory: ${avail_mem_mb} MB available (instance cache capped at 256 MB)"

  # systemd unit validation (staged copy, nothing installed)
  write_unit > "$tmp/$NAME.service"
  if command -v systemd-analyze >/dev/null; then
    systemd-analyze verify "$tmp/$NAME.service" 2>"$tmp/unit-verify.txt" || true
    # Only judge lines about OUR unit — unrelated units on a busy server may print their own warnings.
    if grep -F "$NAME.service" "$tmp/unit-verify.txt" | grep -qiE 'error|invalid|unknown|failed|bad'; then
      cat "$tmp/unit-verify.txt" >&2; die "systemd unit failed validation — nothing was created"
    fi
  fi
  ok "systemd unit validated"

  # MongoDB config validation: real start of the exact config in a throwaway sandbox (temp dbPath/log, temp port)
  sport=""; for p in $(seq 27290 27299); do port_in_use "$p" || { sport=$p; break; }; done
  [[ -n "$sport" ]] || die "no free temporary port in 27290–27299 for the config check"
  install -d -o mongodb -g mongodb -m 0750 "$tmp/data"
  write_conf "$tmp/data" "$tmp/sandbox.log" "$sport" > "$tmp/sandbox.conf"; chmod 644 "$tmp/sandbox.conf"; chown mongodb:mongodb "$tmp/sandbox.conf"
  touch "$tmp/sandbox.log"; chown mongodb:mongodb "$tmp/sandbox.log"
  sudo -u mongodb "$MONGOD" --config "$tmp/sandbox.conf" >"$tmp/sandbox.out" 2>&1 & sandbox_pid=$!
  up=0; for i in $(seq 1 30); do port_in_use "$sport" && { up=1; break; }; kill -0 "$sandbox_pid" 2>/dev/null || break; sleep 1; done
  if (( ! up )); then tail -20 "$tmp/sandbox.out" "$tmp/sandbox.log" >&2 2>/dev/null; die "MongoDB rejected the generated configuration — nothing was created"; fi
  anon="$(mongosh --nodb --quiet --eval "try { connect('mongodb://127.0.0.1:$sport/admin?serverSelectionTimeoutMS=3000').adminCommand({listDatabases:1}); print('OPEN') } catch (e) { print('AUTH_ENFORCED') }" 2>&1 || true)"
  grep -q AUTH_ENFORCED <<<"$anon" || die "sandbox check: authentication is not enforced — nothing was created"
  grep -q '"cacheSizeGB":0.25' "$tmp/sandbox.log" || warn "could not confirm cacheSizeGB in the sandbox log (continuing)"
  cleanup_sandbox
  ok "MongoDB config validated in a sandbox (started on 127.0.0.1:$sport with auth enforced, then removed)"

  if (( CHECK_ONLY )); then ok "PRE-FLIGHT PASSED — nothing was created (run without --check to install)"; exit 0; fi

  # ════════════════════════════ 2. INSTALL ════════════════════════════
  install -d -o mongodb -g mongodb -m 0750 "$DATA"
  install -d -o mongodb -g mongodb -m 0755 /var/log/mongodb
  write_conf "$DATA" "$LOGF" "$PORT" > "$CONF"; chmod 0644 "$CONF"
  install -m 0644 "$tmp/$NAME.service" "$UNIT"
  systemctl daemon-reload
  systemctl enable --now "$NAME" >/dev/null 2>&1
  for i in $(seq 1 30); do port_in_use "$PORT" && break; sleep 1; done
  port_in_use "$PORT" || { tail -20 "$LOGF" >&2; die "$NAME did not start (log: $LOGF)"; }
  ok "installed and started $NAME (config $CONF, data $DATA, log $LOGF)"
elif (( CHECK_ONLY )); then
  ok "already installed — nothing to check"; exit 0
fi

# ════════════════════════════ 3. FIRST ADMIN (localhost exception) ════════════════════════════
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
  ok "created admin '$ADMIN_USER' — password stored only in $CRED (root 0600)"
fi

# ════════════════════════════ 4. APP USER + MONGODB_URI ════════════════════════════
MONGO_HOSTPORT="127.0.0.1:$PORT" MONGO_ADMIN_FILE="$CRED" bash "$SCRIPT_DIR/15-mongodb.sh"

# ════════════════════════════ 5. VERIFY ════════════════════════════
systemctl is-active --quiet "$NAME" && systemctl is-enabled --quiet "$NAME" || die "$NAME is not active+enabled"
binds="$(ss -Hltn "sport = :$PORT" | awk '{print $4}' | sort -u | tr '\n' ' ')"
[[ "$binds" == "127.0.0.1:$PORT " ]] || die "$NAME listens on unexpected addresses: $binds"
ok "$NAME active, enabled at boot, listening ONLY on 127.0.0.1:$PORT"
anon="$(mongosh --nodb --quiet --eval "try { connect('mongodb://127.0.0.1:$PORT/admin?serverSelectionTimeoutMS=3000').adminCommand({listDatabases:1}); print('OPEN') } catch (e) { print('AUTH_ENFORCED') }" 2>&1 || true)"
grep -q AUTH_ENFORCED <<<"$anon" || die "authentication is NOT enforced on $NAME"
ok "anonymous access refused (authentication enforced)"
changed=0
for p in "${PROTECTED_PORTS[@]}"; do
  now="$(listener_pid "$p")"
  if [[ "$now" == "${BEFORE[$p]}" ]]; then ok "existing MongoDB on :$p unchanged (pid ${now:-not running})"
  else warn "MongoDB on :$p changed (pid ${BEFORE[$p]:-none} → ${now:-none}) — this script did not touch it; investigate"; changed=1; fi
done
(( changed == 0 )) || die "an existing MongoDB instance changed during this run — review before continuing"
ok "THE REVEAL has its own MongoDB: $NAME on 127.0.0.1:$PORT, database $REVEAL_DB — next: sudo bash deploy/vps/20-release.sh"
