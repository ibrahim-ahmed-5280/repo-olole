#!/usr/bin/env bash
# Builds and verifies a release in its OWN directory (the running site is not touched).
#   sudo bash deploy/vps/20-release.sh                 # latest commit of feature/the-reveal
#   sudo bash deploy/vps/20-release.sh <commit-sha>    # an explicit commit
#   EXPECT_SHA=<sha> sudo -E bash deploy/vps/20-release.sh   # abort unless the branch is exactly at <sha>
# Runs: npm ci → typecheck → lint → unit tests → component tests → [API integration tests] → build → bundle checks.
# API integration tests need a throwaway MongoDB they may create/drop databases on:
#   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 sudo -E bash deploy/vps/20-release.sh
# (skipped otherwise — they already pass in CI/locally for the same commit; the report says so explicitly).
source "$(dirname "$0")/lib.sh"
need_root
[[ -d "$REVEAL_REPO_CACHE" ]] || die "run 10-prepare.sh first"
grep -q '^MONGODB_URI=mongodb://REPLACE_ME' "$REVEAL_ENV_FILE" && die "MONGODB_URI is still a placeholder — run 15-mongodb.sh first"
check_node_version

as_reveal git -C "$REVEAL_REPO_CACHE" fetch --prune origin "+refs/heads/*:refs/heads/*" >/dev/null
ref="${1:-refs/heads/$REVEAL_BRANCH}"
sha="$(as_reveal git -C "$REVEAL_REPO_CACHE" rev-parse --verify "$ref^{commit}")" || die "unknown ref $ref"
[[ -z "${EXPECT_SHA:-}" || "$sha" == "$EXPECT_SHA"* ]] || die "branch is at $sha, expected $EXPECT_SHA — refusing to deploy an unverified commit"
as_reveal git -C "$REVEAL_REPO_CACHE" merge-base --is-ancestor "$sha" "refs/heads/$REVEAL_BRANCH" \
  || die "$sha is not on $REVEAL_BRANCH"
subject="$(as_reveal git -C "$REVEAL_REPO_CACHE" log -1 --format='%h %s' "$sha")"
info "release commit: $subject"

dir="$REVEAL_RELEASES/$sha"
if [[ -f "$dir/BUILD_OK" ]]; then ok "release already built and verified: $dir"; echo "$sha"; exit 0; fi
rm -rf "$dir"; install -d -o "$REVEAL_USER" -g "$REVEAL_USER" "$dir"
as_reveal bash -c "git -C '$REVEAL_REPO_CACHE' archive '$sha' | tar -x -C '$dir'"
echo "$sha" | as_reveal tee "$dir/RELEASE" >/dev/null
as_reveal ln -s "$REVEAL_ENV_FILE" "$dir/.env"   # vite reads VITE_* from it; secrets are never exposed (prefix filter)
log="$dir/build.log"; as_reveal touch "$log"

step() {
  local name="$1"; shift
  info "$name…"
  if as_reveal bash -c "cd '$dir' && $*" >>"$log" 2>&1; then ok "$name"; else
    tail -40 "$log" >&2; die "$name FAILED (full log: $log). The live site was not changed."
  fi
}
step "npm ci"                    "npm ci --no-audit --no-fund"
step "typecheck"                 "npm run typecheck"
step "lint"                      "npm run lint"
step "unit tests (shared)"       "npm run test:unit"
step "component tests (web)"     "npm run test:web"
if [[ -n "${MONGODB_TEST_URI:-}" ]]; then
  step "API integration tests"   "MONGODB_TEST_URI='$MONGODB_TEST_URI' npm run test:api"
else
  warn "API integration tests SKIPPED (set MONGODB_TEST_URI to run them on this server)"
  echo "API integration tests: SKIPPED on server" >>"$log"
fi
step "production build"          "npm run build"

# Bundle checks: no development API origins, canonical URL baked in, admin chunk is lazy.
if grep -rlE 'localhost:4000|127\.0\.0\.1:4000|localhost:5173' "$dir/apps/web/dist" >/dev/null; then
  die "built web bundle references a development origin"
fi
grep -q "<link rel=\"canonical\" href=\"https://$REVEAL_DOMAIN/\"" "$dir/apps/web/dist/index.html" \
  || die "index.html canonical URL is not https://$REVEAL_DOMAIN/ (check VITE_SITE_URL)"
[[ -f "$dir/apps/api/dist/server.js" ]] || die "API build missing"
ok "bundle checks passed"

printf 'commit=%s\nbuilt_at=%s\nnode=%s\n' "$sha" "$(date -u +%FT%TZ)" "$(node -v)" | as_reveal tee "$dir/BUILD_OK" >/dev/null
ok "release ready: $dir"
echo "Next (first time): sudo bash deploy/vps/30-database.sh $sha   then   sudo bash deploy/vps/40-activate.sh $sha"
echo "$sha"
