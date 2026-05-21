# Deploy runbook: Basketball seasons

## Rollback artifacts

| Layer | Rollback |
| --- | --- |
| Database | [`supabase/migrations/rollback/20260520160000_basketball_seasons_rollback.sql`](../../supabase/migrations/rollback/20260520160000_basketball_seasons_rollback.sql) |
| Edge function | `git checkout 18afd31 -- supabase/functions/admin-write && supabase functions deploy admin-write --no-verify-jwt` |
| Frontend | `git revert <deploy-commit>` on `main` and push, or reset to `18afd31` and force-push only if coordinated |

**Pre-deploy git SHA (last known good before seasons):** `18afd31`

**Rollback order (safest):** frontend → edge function → database.

## Deploy order

1. **Pre-flight** — `npm test`, `npm run build`, optional local `scripts/validate-basketball-seasons-db.sql`
2. **Database** — `supabase db push` (applies `20260520160000_basketball_seasons.sql`)
3. **Edge functions** — `supabase functions deploy admin-write --no-verify-jwt`
4. **Frontend** — commit + push to `main` (GitHub Actions → GitHub Pages)

Or: `./scripts/deploy-basketball-seasons.sh all` then commit/push.

## Post-deploy smoke checks

- `GET /rest/v1/basketball_seasons` returns Season 1 active
- `POST /rest/v1/rpc/ensure_basketball_season_active` returns `1`
- Basketball dashboard / leaderboards / game view show season toolbar + countdown
- Admin **Start next season** works (optional; only if testing rollover)

## Forward migration notes

- All existing basketball rounds are assigned to **Season 1**
- Active season ends **2026-06-21 07:00:00 UTC** (Jun 21 00:00 America/Los_Angeles)
- Auto-rollover runs when the app loads seasons (`ensure_basketball_season_active`)
