# Execution Plan: Basketball Seasons

_Implements: product-brief_basketball-seasons.md · Date: 2026-05-20_

See approved plan in Cursor plans for full deliverable DAG. Implementation completed in-repo.

## Summary

- `basketball_seasons` table + `rounds.basketball_season_id` with Season 1 backfill
- Season-scoped reads for dashboard, leaderboards (basketball), and OpenSkill history
- Basketball-only `BasketballSeasonToolbar` with countdown notice and admin rollover
- RPC: `ensure_basketball_season_active`, `force_basketball_season_rollover`
