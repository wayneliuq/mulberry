# Execution Plan: Leaderboard noise filter & per-game-type round sort
_Implements: product-brief_leaderboard-noise-and-sort.md · Date: 2026-06-08_

## Context
Two atomic UI/filter changes that share the same theme ("show only players who have actually played"):

- **D1** — Basketball player leaderboard hides players with ≤ 10 rounds in the active and any future season; historical seasons remain unfiltered.
- **D2** — Add-players drawer in `GameViewPage` (any game type) sorts by per-game-type round count instead of per-game round count. The existing `rounds-desc` sort path is reused.

## Library lifecycle audit
No new dependencies. The work uses the existing `@supabase/supabase-js` client and `@tanstack/react-query` query/cache layer. No SDK lifecycle concerns.

## Deliverables (DAG)

### D1 — Basketball player leaderboard hides sub-11-round players in current and future seasons
- **Integration-risk class:** `c` (cross-component reactive state coordination: `LeaderboardsPage` ↔ `useBasketballSeasons` ↔ `fetchLeaderboards`)
- **User-acceptance steps (from brief):** see brief D1, 4 steps
- **Macro-deliverable:** false
- **Domains & file partition:** n/a
- **Validation method (chosen here):** **tdd** — add tests for the `applyMinRoundsFilter` flag in `fetchLeaderboards` that prove (a) 10 rounds excluded, 11 included, (b) flag off → all rows preserved, (c) non-basketball game type → filter not applied even with flag on, (d) flag off when a past season is requested. Then run the existing `LeaderboardsPage` and `lib/api` test suites to confirm no regressions.
- **Files:**
  - `src/lib/api/read.ts` — add `LEADERBOARD_MIN_ROUNDS` constant; extend `fetchLeaderboards` signature with `applyMinRoundsFilter?: boolean`; apply filter to `playerRows` only when set.
  - `src/routes/LeaderboardsPage.tsx` — derive `applyMinRoundsFilter` from `useBasketballSeasons`: `true` when `selectedSeasonId === activeSeasonId || selectedSeasonId > activeSeasonId`; pass into the query.
  - `src/lib/api/read.test.ts` (or new) — add a focused test file for the new filter behavior with a hand-rolled mocked supabase chain.
- **Steps:**
  1. Add `LEADERBOARD_MIN_ROUNDS = 10` next to the existing leaderboard-related types.
  2. Extend `fetchLeaderboards` with an optional `applyMinRoundsFilter`; when true, drop any player whose `roundsWon + roundsLost <= 10` from the final `playerRows` (do not affect `familyRows`).
  3. In `LeaderboardsPage`, read `activeSeasonId` from `useBasketballSeasons`; set `applyMinRoundsFilter = selectedSeasonId != null && selectedSeasonId >= activeSeasonId`.
  4. Add tests that exercise the four cases in the validation method above.
  5. Run `npm run test` and the new tests.
- **Deps:** none
- **Pre-flight env check:** `npm run test` runs without network (uses mocked supabase client); confirm vitest baseline passes.
- **may-invalidate:** `docs/game-type-basketball.md` (round-counts definition is referenced in §"Basketball dashboard" / §"Leaderboards"; the leaderboard behavior changes for current+future seasons only). Will add one sentence in §"Basketball seasons" referencing the filter. **Auto-update in the same commit.**
- **Visual contract:** n/a (no new screen)
- **Consumer audit:**
  - `src/routes/LeaderboardsPage.tsx` — `updated-in-this-deliverable` (passes the new flag)
  - `src/routes/DashboardsPage.tsx` — `unaffected-because-it-consumes-BasketballDashboardData-not-LeaderboardData`
  - `src/lib/api/types.ts` — `unaffected-because-shape-of-LeaderboardData-does-not-change`

### D2 — Add-players drawer sorts by rounds played in the target game type
- **Integration-risk class:** `c` (cross-component reactive state: `GameViewPage` ↔ new `fetchPlayerRoundCountsByGameType` ↔ existing `rounds-desc` sort in `SortablePlayerList`)
- **User-acceptance steps (from brief):** see brief D2, 3 steps
- **Macro-deliverable:** false
- **Domains & file partition:** n/a
- **Validation method (chosen here):** **tdd** — add a unit test for `fetchPlayerRoundCountsByGameType` with a mocked supabase chain that proves: (a) returns counts aggregated per `(game_type_id, player_id)`, (b) when `seasonId` is provided, only that season's rounds count, (c) when no `seasonId`, all games of that type are counted. Also update `AddPlayersDrawer.test.tsx` to pass the new prop. Then run the full suite.
- **Files:**
  - `src/lib/api/read.ts` — new exported function `fetchPlayerRoundCountsByGameType(gameTypeId, options?: { seasonId?: number }): Promise<Map<number, number>>`. Implementation re-uses the same `round_entries` → `rounds` join pattern already used in `fetchLeaderboards` / `fetchBasketballRoundHistory`.
  - `src/routes/GameViewPage.tsx` — replace `gameRoundCountByPlayerId` (per-game) with a new `useQuery` keyed by `["player-round-counts", game.gameTypeId, isBasketball ? activeSeasonId : null]`. Pass the resulting map's per-player count into `availablePlayers[].roundsPlayed`. Remove the now-unused `computeRoundCountsFromGameRounds` import (still used elsewhere — see consumer audit).
  - `src/features/players/SortablePlayerList.tsx` — no code change; the existing `rounds-desc` branch already does `(b.roundsPlayed ?? 0) - (a.roundsPlayed ?? 0)` with the player-id tiebreaker. We just feed it correct data.
  - `src/lib/api/read.test.ts` (or new) — tests for `fetchPlayerRoundCountsByGameType`.
- **Steps:**
  1. Implement `fetchPlayerRoundCountsByGameType` and its tests.
  2. In `GameViewPage`, add the new `useQuery`, replace the `gameRoundCountByPlayerId` source, and update the `availablePlayers` `useMemo` to read from the new map.
  3. Run `npm run test`.
- **Deps:** none
- **Pre-flight env check:** `npm run test` baseline passes.
- **may-invalidate:** none
- **Visual contract:** n/a (no new screen)
- **Consumer audit:**
  - `src/features/players/SortablePlayerList.tsx` — `unaffected-because-rounds-desc-already-uses-roundsPlayed-and-PlayerLike-shape-does-not-change`
  - `src/features/players/AddPlayersDrawer.tsx` — `unaffected-because-it-already-passes-players-through-sortMode; only-the-input-data-source-changes-upstream`
  - `src/features/players/AddPlayersDrawer.test.tsx` — `unaffected-because-mock-players-already-pass-roundsPlayed-prop-directly`
  - `src/features/players/SortablePlayerList.tsx` `computeRoundCountsFromGameRounds` — `unaffected-because-it-remains-an-exported-helper-not-internally-removed; can-stay-as-legacy-utility`

## Parallel groups & order
- **Sequential**: D1 and D2 share no files; can be built in parallel or sequential. Plan: do D1 first (its `applyMinRoundsFilter` flag setup establishes the "current vs past season" pattern that D2 also needs to reason about for basketball).
- **Workflow decision:** none — all deliverables decomposable, no macro-deliverable.

## Reused existing patterns
- `useBasketballSeasons` already exposes `activeSeasonId` and `selectedSeasonId`; no new season-resolution hook needed.
- `SelectAll<>` pagination helper from `lib/supabase/selectAll` already used by every read in `lib/api/read.ts`.
- `@tanstack/react-query` `useQuery` with `queryKey` based on `(entity, filter1, filter2)` is the existing pattern in both `LeaderboardsPage` and `GameViewPage`.
- `PlayerLike.roundsPlayed` field and `rounds-desc` sort branch in `SortablePlayerList.tsx` already implement the per-game-type round sort — the data source is the only thing that needs to change.
- Existing `LEADERBOARD_MIN_ROUNDS` constant will live next to other read-side constants; mirrors the existing `PLAYER_MIN_ROUNDS` in `features/dashboards/basketball/constants.ts` (different value, different scope — kept distinct on purpose).

## Risks & contingencies
- New supabase read on every game-view open: cache it via the existing `useQuery` staleTime patterns (default 0; either accept the read or add a 30s staleTime). **Plan: leave default; the leaderboards query already runs in the same session, and the read is light.**
- The `availablePlayers` `useMemo` is currently keyed on `[allPlayers, currentGamePlayerIds, gameRoundCountByPlayerId]`; the new key will include the round-counts query data identity. Will ensure no infinite re-render loop.
- The user may revisit the threshold (10 vs 20). Keeping the constant in one named export means a single-line change.

## Out of scope for this plan
- Family leaderboard filter.
- Non-basketball leaderboard filter.
- A user-facing toggle.
- Dashboard threshold changes.
- Per-game-type leaderboard for non-basketball games (e.g., dixit leaderboard only showing 11+ rounds). The user only mentioned basketball for the filter.
