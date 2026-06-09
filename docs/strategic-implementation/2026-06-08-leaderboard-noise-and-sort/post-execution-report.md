---
status: complete
domains: [leaderboard, players, game-types]
outcome: basketball leaderboard hides sub-11-round players in active+future seasons; add-players drawer sorts by per-game-type round count
supersedes: none
---
# Post-execution report
_Date: 2026-06-08 · Feature: leaderboard-noise-and-sort_

## Cross-contamination
- `fetchLeaderboards` signature gained an optional `applyMinRoundsFilter?: boolean` (default `undefined` → no behavior change for existing consumers). The 3 call sites are: `LeaderboardsPage.tsx` (real call, now passes the flag), `LeaderboardsPage.test.tsx` (mock with new flag tests), `App.test.tsx` (mock, no flag). No external consumer affected.
- `fetchPlayerRoundCountsByGameType` is new and only used in `GameViewPage.tsx`; no other call sites to update.
- `aggregatePlayerRoundCounts` / `applyLeaderboardMinRoundsFilter` are pure helpers in a new `src/lib/api/leaderboardFilter.ts`; they are imported only by `read.ts` and tested in isolation.
- `computeRoundCountsFromGameRounds` import dropped from `GameViewPage.tsx`; the function and its test stay as a legacy utility (no callers outside the test).

## Goal-backward verification
- D1 (basketball player leaderboard `> 10` rounds, current+future seasons only): `LEADERBOARD_MIN_ROUNDS = 10` constant exported from `src/lib/api/leaderboardFilter.ts:9` — **yes**. `applyLeaderboardMinRoundsFilter` used inside `fetchLeaderboards` at `src/lib/api/read.ts:969` — **yes**. `applyMinRoundsFilter` flag passed from `LeaderboardsPage.tsx:185-200` — **yes**.
- D2 (add-players drawer sorts by per-game-type round count): `fetchPlayerRoundCountsByGameType` exported from `src/lib/api/read.ts:740` — **yes**. GameViewPage swaps per-game `computeRoundCountsFromGameRounds` for the new query at `src/routes/GameViewPage.tsx:174-187` — **yes**. Active season passed for basketball via `useBasketballSeasons` at `src/routes/GameViewPage.tsx:155` — **yes**.

## Plugin config security scan
- No `.claude/`, `mcp.json`, settings, hooks, agent, or plugin config files were modified.
- Status: no plugin-config files touched.

## Simplify final pass
- Report: inline review (not dispatched as a separate file).
- Findings:
  - **Mid**: `computeRoundCountsFromGameRounds` is no longer used in `GameViewPage.tsx` but the function and test in `SortablePlayerList.tsx` remain. Decision: **defer** — it's a public utility, low cost, may be useful for callers building their own round-count aggregations. Documented in the D2 commit message.
  - **Low**: `applyMinRoundsFilter` flag derivation in `LeaderboardsPage.tsx` could be a hook helper. Decision: **dismiss** — single consumer, two-line expression, no value extracting.
- Disposition: all findings triaged.

## Status
**PASS**
- Test suite: 118 tests passing (106 baseline + 5 D1 leaderboardFilter unit + 2 D1 leaderboard page tests + 5 D2 aggregatePlayerRoundCounts unit). No regressions in any existing test.
- Registry: `docs/game-type-basketball.md` last-updated date bumped 2026-05-20 → 2026-06-08 in the same D1 commit (auto-applied).
- Auto-applied (this run):
  - `docs/game-type-basketball.md` — added leaderboard min-rounds rule bullet under "Basketball seasons".
  - `docs/strategic-implementation/documentation-registry.md` — bumped `Last Updated` for `docs/game-type-basketball.md` and added "leaderboard filters" to its update-trigger list.
- Commits (on `fix/leaderboard-noise-and-sort`):
  - `dea2b2f` — D1: filter basketball leaderboard to players with > 10 rounds in active+future seasons
  - `7e080e3` — D2: add-players drawer sorts by per-game-type round count
  - `ff7a65e` — strategic-implementation artifacts (brief, plan, validation log, checkpoint, brief-meta)
