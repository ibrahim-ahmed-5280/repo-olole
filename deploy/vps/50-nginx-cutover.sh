#!/usr/bin/env bash
# Switches https://zdu.elivateict.com from the old site to THE REVEAL — ONLY the zdu server block.
#
#   sudo bash deploy/vps/50-nginx-cutover.sh            # DRY RUN (default): renders + validates in a COPY of /etc/nginx
#   sudo bash deploy/vps/50-nginx-cutover.sh --apply    # real cutover (asks for typed confirmation)
#
# Safety:
#  • refuses if the zdu block shares a file with other hostnames, or if THE REVEAL API is not healthy
#  • reuses the existing certificate/SSL includes/ACME webroot of the zdu block (no certbot changes)
#  • backs up ONLY the zdu file (+ a full `nginx -T` text dump for reference) to /var/backups/the-reveal
#  • never edits any other tenant's file; never deletes the old file (it is moved into the backup)
#  • checks every other hostname before/after, and auto-rolls back if THE REVEAL is not reachable over HTTPS
source "$(dirname "$0")/lib.sh"
need_root
APPLY=0; [[ "${1:-}" == "--apply" ]] && APPLY=1

DOMAIN_RE="${REVEAL_DOMAIN//./\\.}"
NEW_NAME="the-reveal-zdu.conf"
APP_REAL="$(readlink -f "$REVEAL_APP")"; [[ -f "$APP_REAL/BUILD_OK" ]] || die "no active release — run 40-activate.sh first"
TEMPLATE="$APP_REAL/deploy/nginx/the-reveal-zdu.conf.template"
SNIPPET_SRC="$APP_REAL/deploy/nginx/the-reveal-proxy.conf"
SNIPPET_DST="/etc/nginx/snippets/the-reveal-proxy.conf"

tenant_status() {  # "<hostname> <https status>" for every other hostname served by this nginx
  nginx -T 2>/dev/null | grep -E '^\s*server_name' | sed -E 's/^\s*server_name\s+//; s/;.*//' | tr ' ' '\n' \
    | grep -vE "^(_|$DOMAIN_RE|localhost|)$" | grep -vE '[~*]' | sort -u | while read -r h; do
      printf '%s %s\n' "$h" "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 --resolve "$h:443:127.0.0.1" "https://$h/" || true)"
    done || true   # an empty hostname list is not an error
}

# ── 1. Preconditions ─────────────────────────────────────────────────────────────────────────────────
systemctl is-active --quiet "$REVEAL_SERVICE" || die "$REVEAL_SERVICE is not running"
wait_for_health || die "THE REVEAL API is not healthy on 127.0.0.1:$REVEAL_PORT"
nginx -t 2>/dev/null || die "the CURRENT nginx configuration is invalid — fix that first (nothing changed)"

# -R (not -r): sites-enabled entries are usually symlinks, which grep -r skips during recursion.
mapfile -t files < <(grep -RlE "server_name[^;]*[[:space:]]$DOMAIN_RE([[:space:];]|$)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true)
for f in "${files[@]}"; do [[ "$(basename "$f")" == "$NEW_NAME" ]] && die "already cut over ($f is active). Use 60-rollback.sh to go back."; done
(( ${#files[@]} == 1 )) || die "expected exactly ONE enabled file serving $REVEAL_DOMAIN, found ${#files[@]}: ${files[*]:-none} — manual review needed"
old_enabled="${files[0]}"; old_real="$(readlink -f "$old_enabled")"; old_is_link=0; [[ -L "$old_enabled" ]] && old_is_link=1
others="$(grep -E '^\s*server_name' "$old_real" | sed -E 's/^\s*server_name\s+//; s/;.*//' | tr ' ' '\n' | grep -vE "^(_|$DOMAIN_RE|www\.$DOMAIN_RE|)$" | sort -u | tr '\n' ' ' || true)"
[[ -z "$others" ]] || die "$old_real also serves: $others— it must be split manually first (see docs/NGINX_CUTOVER.md)"
grep -qE 'listen[^;]*default_server' "$old_real" && die "$old_real holds a default_server — replacing it would change the catch-all site for other tenants; manual review needed"
grep -qE "server_name[^;]*www\.$DOMAIN_RE" "$old_real" && warn "old block also lists www.$REVEAL_DOMAIN — not carried over (the certificate does not cover it)"
ok "zdu block: $old_enabled → $old_real"

# ── 2. Values reused from the existing zdu block ────────────────────────────────────────────────────
cert="$(grep -E '^\s*ssl_certificate\s' "$old_real" | head -1 | awk '{print $2}' | tr -d ';' || true)"
key="$(grep -E '^\s*ssl_certificate_key\s' "$old_real" | head -1 | awk '{print $2}' | tr -d ';' || true)"
: "${cert:=/etc/letsencrypt/live/$REVEAL_DOMAIN/fullchain.pem}"; : "${key:=/etc/letsencrypt/live/$REVEAL_DOMAIN/privkey.pem}"
[[ -e "$cert" && -e "$key" ]] || die "certificate files not found ($cert / $key)"
openssl x509 -in "$cert" -noout -checkend 604800 >/dev/null || warn "certificate expires within 7 days — renew first (certbot renew)"
openssl x509 -in "$cert" -noout -ext subjectAltName 2>/dev/null | grep -q "DNS:$REVEAL_DOMAIN" || die "certificate does not cover $REVEAL_DOMAIN"
ok "certificate: $cert (valid until $(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2))"

# Certbot writes these as "include /etc/letsencrypt/options-ssl-nginx.conf;" — note the ';' right after the path.
ssl_extra="$(grep -E '^\s*(include\s+/etc/letsencrypt/options-ssl-nginx\.conf|ssl_dhparam)[[:space:];]' "$old_real" | sed -E 's/^\s*/    /' | sort -u || true)"
acme=""
renewal="/etc/letsencrypt/renewal/$REVEAL_DOMAIN.conf"
if [[ -f "$renewal" ]] && grep -qE '^\s*authenticator\s*=\s*webroot' "$renewal"; then
  webroot="$(grep -E '^\s*webroot_path\s*=' "$renewal" | head -1 | sed -E 's/.*=\s*//; s/,.*//; s/\s+$//' || true)"
  [[ -n "$webroot" ]] && acme="    location ^~ /.well-known/acme-challenge/ { root $webroot; }"
fi
info "certbot renewal: $( [[ -f "$renewal" ]] && grep -E '^\s*authenticator' "$renewal" | sed 's/ //g' || echo 'no renewal file found')"

if grep -qE 'listen\s+\[::\]' "$old_real"; then ipv6=1; else ipv6=0; fi
ngv="$(nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)"
if [[ "$(printf '%s\n1.25.1\n' "$ngv" | sort -V | head -1)" == "1.25.1" ]]; then
  listen="    listen 443 ssl;"; (( ipv6 )) && listen+=$'\n    listen [::]:443 ssl;'; listen+=$'\n    http2 on;'
else
  listen="    listen 443 ssl http2;"; (( ipv6 )) && listen+=$'\n    listen [::]:443 ssl http2;'
fi

render() {  # $1 = path of the proxy snippet to reference
  # bash 5.2 (Ubuntu 24.04) would treat '&' in replacement values as "the matched text" — switch that off.
  shopt -u patsub_replacement 2>/dev/null || true
  local t; t="$(<"$TEMPLATE")"
  t="${t//@DOMAIN@/$REVEAL_DOMAIN}"; t="${t//@PORT@/$REVEAL_PORT}"; t="${t//@APP@/$REVEAL_APP}"
  t="${t//@SSL_CERT@/$cert}"; t="${t//@SSL_KEY@/$key}"; t="${t//@SSL_EXTRA@/$ssl_extra}"
  t="${t//@ACME_LOCATION@/$acme}"; t="${t//@LISTEN_443@/$listen}"; t="${t//@PROXY_SNIPPET@/$1}"
  (( ipv6 )) || t="$(printf '%s\n' "$t" | grep -v 'listen \[::\]:80;' || true)"
  printf '%s\n' "$t"
}

case "$(dirname "$old_enabled")" in
  /etc/nginx/sites-enabled) new_available="/etc/nginx/sites-available/$NEW_NAME"; new_enabled="/etc/nginx/sites-enabled/$NEW_NAME" ;;
  /etc/nginx/conf.d)        new_available="";                                     new_enabled="/etc/nginx/conf.d/$NEW_NAME" ;;
  *) die "unexpected location $old_enabled" ;;
esac

# ── 3. Validate in a COPY of /etc/nginx (live config untouched) ─────────────────────────────────────
preview="$REVEAL_BACKUP_DIR/cutover-preview-$(ts)"; install -d -m 0700 "$preview"
sandbox="$(mktemp -d)"; trap 'rm -rf "$sandbox"' EXIT
cp -a /etc/nginx "$sandbox/"; S="$sandbox/nginx"
# -r (not -R) on purpose: never follow symlinks into the LIVE /etc/nginx files.
grep -rlI '/etc/nginx/' "$S" 2>/dev/null | xargs -r sed -i "s#/etc/nginx/#$S/#g"
rm -f "$S/${old_enabled#/etc/nginx/}"
install -d "$S/snippets"; cp "$SNIPPET_SRC" "$S/snippets/the-reveal-proxy.conf"
render "$S/snippets/the-reveal-proxy.conf" > "$S/${new_enabled#/etc/nginx/}"
render "$SNIPPET_DST" > "$preview/$NEW_NAME"
if nginx -t -c "$S/nginx.conf" >"$preview/nginx-t.txt" 2>&1; then ok "new configuration validates (nginx -t on a sandbox copy)"; else
  cat "$preview/nginx-t.txt" >&2; die "new configuration does NOT validate — nothing was changed (preview in $preview)"
fi
ok "rendered config saved for review: $preview/$NEW_NAME"

if (( ! APPLY )); then
  echo; echo "──── DRY RUN — nothing changed. Review:  sudo less $preview/$NEW_NAME"
  echo "Would disable: $old_enabled ($( ((old_is_link)) && echo symlink || echo file))   →  enable: $new_enabled"
  echo "To cut over (after staging sign-off and owner approval):  sudo bash $0 --apply"
  exit 0
fi

# ── 4. Apply ────────────────────────────────────────────────────────────────────────────────────────
read -r -p "Type  CUTOVER $REVEAL_DOMAIN  to switch the live domain to THE REVEAL: " answer
[[ "$answer" == "CUTOVER $REVEAL_DOMAIN" ]] || die "not confirmed — nothing changed"

bk="$REVEAL_BACKUP_DIR/nginx-cutover-$(ts)"; install -d -m 0700 "$bk"
cp -a "$old_real" "$bk/old-zdu.conf"
nginx -T > "$bk/nginx-T-before.txt" 2>&1
tenant_status > "$bk/tenants-before.txt"
cat > "$bk/manifest" <<EOF
OLD_ENABLED='$old_enabled'
OLD_REAL='$old_real'
OLD_IS_LINK=$old_is_link
NEW_ENABLED='$new_enabled'
NEW_AVAILABLE='$new_available'
CREATED_AT='$(date -u +%FT%TZ)'
EOF
ok "backup: $bk"

restore_now() { REVEAL_ROLLBACK_NONINTERACTIVE=1 bash "$SCRIPT_DIR/60-rollback.sh" "$bk"; }

install -m 0644 "$SNIPPET_SRC" "$SNIPPET_DST"
if [[ -n "$new_available" ]]; then install -m 0644 "$preview/$NEW_NAME" "$new_available"; fi
if (( old_is_link )); then rm -f "$old_enabled"; else mv "$old_enabled" "$bk/old-enabled-file"; fi
if [[ -n "$new_available" ]]; then ln -sfn "$new_available" "$new_enabled"; else install -m 0644 "$preview/$NEW_NAME" "$new_enabled"; fi

if ! nginx -t 2>"$bk/nginx-t-apply.txt"; then cat "$bk/nginx-t-apply.txt" >&2; warn "nginx -t failed — restoring"; restore_now; die "cutover aborted, old site restored"; fi
systemctl reload nginx
sleep 2

fail=""
curl -fsS --max-time 10 --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/api/v1/health" | grep -q '"db":"up"' || fail+="api-health "
curl -fsS --max-time 10 --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/" | grep -q '<div id="root">' || fail+="homepage "
curl -fsS --max-time 10 --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/roadmap/midnimo" | grep -q '<div id="root">' || fail+="spa-fallback "
[[ "$(curl -s -o /dev/null -w '%{http_code}' --resolve "$REVEAL_DOMAIN:80:127.0.0.1" "http://$REVEAL_DOMAIN/")" == 301 ]] || fail+="http-redirect "
if [[ -n "$fail" ]]; then warn "post-cutover checks failed: $fail— rolling back automatically"; restore_now; die "cutover rolled back"; fi
ok "THE REVEAL is now served at https://$REVEAL_DOMAIN/"

tenant_status > "$bk/tenants-after.txt"
if diff -u "$bk/tenants-before.txt" "$bk/tenants-after.txt" >"$bk/tenants.diff"; then ok "all other hostnames respond exactly as before ($(wc -l < "$bk/tenants-after.txt") checked)"
else warn "other hostnames changed status — review $bk/tenants.diff (THE REVEAL change does not touch them)"; cat "$bk/tenants.diff"; fi

# Staging origin no longer needed once the public domain works.
if grep -q "http://localhost:$REVEAL_PORT" "$REVEAL_ENV_FILE"; then
  cp -a "$REVEAL_ENV_FILE" "$bk/api.env.before-cutover"
  sed -i "s#,http://localhost:$REVEAL_PORT##" "$REVEAL_ENV_FILE"
  systemctl restart "$REVEAL_SERVICE"; wait_for_health || warn "API restart after removing the staging origin was not healthy — check journalctl"
  ok "removed the SSH-tunnel staging origin from ALLOWED_ORIGINS"
fi
echo "Rollback at any time:  sudo bash deploy/vps/60-rollback.sh $bk"
