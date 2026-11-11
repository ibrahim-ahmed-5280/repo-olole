#!/usr/bin/env bash
# READ-ONLY infrastructure inspection. Changes nothing. Paste the output back for review.
#   sudo bash deploy/vps/00-inspect.sh 2>&1 | tee ~/reveal-inspection.txt
# (sudo is only used to READ nginx config, listening-process names and certbot metadata.)
source "$(dirname "$0")/lib.sh"
set +e  # keep going even if some probes fail
trap - ERR  # read-only probes are allowed to fail quietly

section() { printf '\n==================== %s ====================\n' "$*"; }

section "SYSTEM"
. /etc/os-release 2>/dev/null && echo "OS: $PRETTY_NAME"
uname -srm
echo "Uptime: $(uptime -p 2>/dev/null)"
echo "Time (UTC): $(date -u)"

section "RESOURCES"
free -h
df -h / /srv /var 2>/dev/null | awk 'NR==1 || !seen[$1]++'
nproc | sed 's/^/CPUs: /'

section "RUNTIMES"
for b in node npm git mongosh mongod mongodump nginx certbot ufw; do
  printf '%-10s ' "$b"
  if ! command -v "$b" >/dev/null; then echo "(not installed)"; continue; fi
  case "$b" in
    nginx) nginx -v 2>&1 ;;
    *) { "$b" --version 2>&1 || true; } | sed -n 1p ;;   # sed reads all input: no SIGPIPE/pipefail false negatives
  esac
done

section "LISTENING TCP PORTS (process names)"
ss -Hltnp 2>/dev/null | awk '{print $4, $6}' | sort -t: -k2 -n | uniq
echo
for p in "$REVEAL_PORT" "$OLD_APP_PORT" 4000 27017 80 443; do
  if port_in_use "$p"; then echo "port $p: IN USE"; else echo "port $p: free"; fi
done

section "SYSTEMD SERVICES (running, non-system)"
systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null \
  | awk '{print $1}' | grep -vE '^(systemd|dbus|cron|ssh|rsyslog|getty|polkit|unattended|snapd|networkd|multipathd|udisks|user@|serial-getty|ModemManager|packagekit|irqbalance|accounts-daemon|atd|fwupd|qemu|chrony|ntp|systemd-)'
echo
for s in "$REVEAL_SERVICE" nginx mongod mongodb; do printf '%-18s %s\n' "$s" "$(systemctl is-active "$s" 2>/dev/null)"; done
echo
echo "Services referencing port $OLD_APP_PORT or /var/www/zakariye:"
grep -rlE "$OLD_APP_PORT|/var/www/zakariye" /etc/systemd/system 2>/dev/null
command -v pm2 >/dev/null && { echo "pm2 processes:"; pm2 ls 2>/dev/null | head -30; }

section "NGINX — ALL server_name ENTRIES"
nginx -T 2>/dev/null | grep -E '^\s*server_name' | sed 's/^\s*//' | sort | uniq -c

section "NGINX — FILES THAT SERVE $REVEAL_DOMAIN"
files=$(grep -RlE "server_name[^;]*\b${REVEAL_DOMAIN//./\\.}\b" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null)
echo "${files:-'(none found in sites-enabled/ or conf.d/)'}"
for f in $files; do
  echo "--- $f  →  $(readlink -f "$f")"
  grep -nE 'listen|server_name|root |proxy_pass|ssl_certificate|include|location|return 30' "$f"
done
echo
echo "Other nginx files proxying to :$OLD_APP_PORT (old API consumers):"
grep -rlE "127\.0\.0\.1:$OLD_APP_PORT|localhost:$OLD_APP_PORT" /etc/nginx 2>/dev/null
echo
echo "nginx -t:"; nginx -t 2>&1 | tail -2
echo "nginx includes: $(nginx -T 2>/dev/null | grep -E '^\s*include ' | sort -u | tr -s ' ' | tr '\n' ' ')"

section "TLS CERTIFICATE FOR $REVEAL_DOMAIN"
certbot certificates -d "$REVEAL_DOMAIN" 2>/dev/null | sed -n '/Certificate Name/,/Private Key Path/p'
[ -f "/etc/letsencrypt/renewal/$REVEAL_DOMAIN.conf" ] && grep -E 'authenticator|installer|webroot_path|server =' "/etc/letsencrypt/renewal/$REVEAL_DOMAIN.conf"
systemctl list-timers --no-pager 2>/dev/null | grep -i certbot
echo | openssl s_client -connect 127.0.0.1:443 -servername "$REVEAL_DOMAIN" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null

section "CURRENT SITE ON $REVEAL_DOMAIN (via local nginx)"
curl -skS -o /dev/null -w 'HTTPS / -> %{http_code}\n' --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/"
curl -skS --resolve "$REVEAL_DOMAIN:443:127.0.0.1" "https://$REVEAL_DOMAIN/" | grep -oiE '<title>[^<]*</title>' | head -1
curl -sS -o /dev/null -w 'HTTP / -> %{http_code} %{redirect_url}\n' --resolve "$REVEAL_DOMAIN:80:127.0.0.1" "http://$REVEAL_DOMAIN/"

section "DNS"
getent hosts "$REVEAL_DOMAIN"
echo "This server's addresses: $(hostname -I 2>/dev/null)"

section "MONGODB"
systemctl is-active mongod 2>/dev/null | sed 's/^/mongod: /'
[ -f /etc/mongod.conf ] && { echo "/etc/mongod.conf (net + security):"; grep -A3 -E '^(net|security):' /etc/mongod.conf; }
docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' 2>/dev/null | grep -i mongo
command -v mongosh >/dev/null && mongosh --quiet --eval 'try{ printjson(db.adminCommand({listDatabases:1,nameOnly:true}).databases.map(d=>d.name)) } catch(e){ print("listDatabases needs auth: " + e.codeName) }' 2>&1 | tail -3

section "APPLICATION DIRECTORIES"
ls -ld /var/www/* /srv/* 2>/dev/null
[ -d /var/www/zakariye/.git ] && git -C /var/www/zakariye log -1 --format='old app /var/www/zakariye: %h %s (%cr)' 2>/dev/null
[ -d "$REVEAL_ROOT" ] && { echo "THE REVEAL already present:"; ls -la "$REVEAL_ROOT"; echo "active release: $(active_release)"; }
id "$REVEAL_USER" 2>/dev/null || echo "user $REVEAL_USER: does not exist yet"

section "FIREWALL"
ufw status 2>/dev/null | head -15
iptables -S INPUT 2>/dev/null | head -10

section "DONE (read-only — nothing was changed)"
