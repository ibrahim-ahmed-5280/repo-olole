# Deployment

Production deployment to the existing VPS (`https://zdu.elivateict.com`) is documented in:

1. [PRODUCTION_DEPLOYMENT_PLAN.md](PRODUCTION_DEPLOYMENT_PLAN.md) — phases, exact copy-and-paste commands, owner decisions
2. [VPS_INSPECTION.md](VPS_INSPECTION.md) — read-only BEFORE state and decision checklist
3. [PRODUCTION_ENVIRONMENT.md](PRODUCTION_ENVIRONMENT.md) — every environment variable and the startup guards
4. [NGINX_CUTOVER.md](NGINX_CUTOVER.md) — how the zdu block is replaced safely, HTTPS checks
5. [ROLLBACK.md](ROLLBACK.md) — domain, release and data rollback
6. [POST_DEPLOYMENT_VERIFICATION.md](POST_DEPLOYMENT_VERIFICATION.md) — staging via SSH tunnel, smoke tests, PASS/FAIL table
7. [MAINTENANCE.md](MAINTENANCE.md) — updates, logs, backups, certificates

Server scripts live in `deploy/vps/` (numbered in execution order), templates in `deploy/env/`, `deploy/systemd/`, `deploy/nginx/`.

For a generic single-server install elsewhere, the same scripts apply; override names/paths with the `REVEAL_*` variables documented at the top of `deploy/vps/lib.sh`.
