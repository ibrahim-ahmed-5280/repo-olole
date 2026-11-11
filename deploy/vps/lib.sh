#!/usr/bin/env bash
# Shared settings + helpers for THE REVEAL VPS scripts. Sourced by the numbered scripts.
# Every value can be overridden from the environment, e.g.  REVEAL_PORT=4330 sudo -E bash 10-prepare.sh
set -euo pipefail

: "${REVEAL_DOMAIN:=zdu.elivateict.com}"
: "${REVEAL_REPO:=https://github.com/ibrahim-ahmed-5280/repo-olole.git}"
: "${REVEAL_BRANCH:=feature/the-reveal}"
: "${REVEAL_USER:=reveal}"                      # dedicated system user (no login shell)
: "${REVEAL_ROOT:=/srv/the-reveal}"             # everything of THE REVEAL lives here
: "${REVEAL_PORT:=4320}"                        # loopback-only API port; MUST NOT be 4310 (old app)
: "${REVEAL_ENV_DIR:=/etc/the-reveal}"
: "${REVEAL_ENV_FILE:=$REVEAL_ENV_DIR/api.env}" # root:reveal 0640 — secrets live here, never in Git
: "${REVEAL_BACKUP_DIR:=/var/backups/the-reveal}"
: "${REVEAL_SERVICE:=the-reveal-api}"
: "${REVEAL_DB:=the_reveal}"
: "${REVEAL_DB_USER:=reveal_app}"
: "${OLD_APP_PORT:=4310}"                       # old Zakariye Digital Universe API — never touched

REVEAL_RELEASES="$REVEAL_ROOT/releases"
REVEAL_APP="$REVEAL_ROOT/app"                   # symlink → active release
REVEAL_UPLOADS="$REVEAL_ROOT/uploads"
REVEAL_REPO_CACHE="$REVEAL_ROOT/repo.git"       # bare mirror used to create releases
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

c_red=$'\e[31m'; c_grn=$'\e[32m'; c_ylw=$'\e[33m'; c_dim=$'\e[2m'; c_off=$'\e[0m'
info() { printf '%s\n' "${c_dim}•${c_off} $*"; }
ok()   { printf '%s\n' "${c_grn}✔${c_off} $*"; }
warn() { printf '%s\n' "${c_ylw}!${c_off} $*" >&2; }
die()  { printf '%s\n' "${c_red}✘ $*${c_off}" >&2; exit 1; }

need_root() { [[ $EUID -eq 0 ]] || die "Run with sudo: sudo bash $0 $*"; }
as_reveal() { sudo -u "$REVEAL_USER" -H "$@"; }

port_in_use() { ss -Hltn "sport = :$1" | grep -q .; }

node_bin() { command -v node || die "node not found in PATH (install Node.js 22 LTS — see docs/PRODUCTION_DEPLOYMENT_PLAN.md)"; }

check_node_version() {
  local v major minor
  v="$("$(node_bin)" -v | sed 's/^v//')"; major="${v%%.*}"; minor="$(echo "$v" | cut -d. -f2)"
  if (( major > 22 || (major == 22 && minor >= 12) )); then ok "Node.js v$v"; else die "Node.js v$v is too old: need ≥ 22.12 (Vite 7 + node --env-file)."; fi
}

# Loopback health check of THE REVEAL API (never goes through Nginx).
api_health() { curl -fsS --max-time 5 "http://127.0.0.1:$REVEAL_PORT/api/v1/health" 2>/dev/null; }

wait_for_health() {
  local i
  for i in $(seq 1 30); do
    if api_health | grep -q '"db":"up"'; then ok "API healthy on 127.0.0.1:$REVEAL_PORT (MongoDB up)"; return 0; fi
    sleep 1
  done
  return 1
}

active_release() { [[ -L "$REVEAL_APP" ]] && basename "$(readlink -f "$REVEAL_APP")" || true; }

ts() { date -u +%Y%m%dT%H%M%SZ; }
