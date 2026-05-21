#!/usr/bin/env bash
# Stepwise deploy for basketball seasons with rollback artifacts documented.
# Usage:
#   ./scripts/deploy-basketball-seasons.sh preflight   # tests + build only
#   ./scripts/deploy-basketball-seasons.sh db          # push migration to linked remote
#   ./scripts/deploy-basketball-seasons.sh functions   # deploy admin-write edge function
#   ./scripts/deploy-basketball-seasons.sh all         # preflight + db + functions (frontend: git push main)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step_preflight() {
  echo "==> Pre-flight: unit tests"
  npm test
  echo "==> Pre-flight: production build"
  npm run build
  echo "==> Pre-flight: local DB validation (requires supabase running)"
  if supabase status >/dev/null 2>&1; then
    psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
      -v ON_ERROR_STOP=1 \
      -f scripts/validate-basketball-seasons-db.sql
  else
    echo "WARN: local supabase not running — skip SQL validation"
  fi
  echo "==> Pre-flight OK"
}

step_db() {
  echo "==> Remote migration status (before)"
  supabase migration list
  echo "==> Pushing migration 20260520160000_basketball_seasons.sql"
  supabase db push
  echo "==> Remote migration status (after)"
  supabase migration list
  echo "==> DB deploy OK"
  echo "Rollback: psql \$DATABASE_URL -f supabase/migrations/rollback/20260520160000_basketball_seasons_rollback.sql"
}

step_functions() {
  echo "==> Deploying edge function admin-write"
  supabase functions deploy admin-write --no-verify-jwt
  echo "==> Functions deploy OK"
  echo "Rollback: redeploy admin-write from previous git commit (git checkout <sha> -- supabase/functions/admin-write && supabase functions deploy admin-write --no-verify-jwt)"
}

case "${1:-}" in
  preflight) step_preflight ;;
  db) step_db ;;
  functions) step_functions ;;
  all)
    step_preflight
    step_db
    step_functions
    echo "==> Next: commit, push to main (triggers GitHub Pages). Rollback frontend: revert commit on main and push."
    ;;
  *)
    echo "Usage: $0 {preflight|db|functions|all}"
    exit 1
    ;;
esac
