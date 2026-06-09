# Validation log

## 2026-06-08 · D1 (player leaderboard > 10 rounds filter)
**Method:** tdd
**Approach:** add `LEADERBOARD_MIN_ROUNDS = 10` constant + filter on `roundsWon + roundsLost > 10` in `fetchLeaderboards` for current/future basketball seasons only. Tests cover: 10 rounds (excluded), 11 rounds (included), past-season bypass, non-basketball bypass.

## 2026-06-08 · D2 (per-game-type round count for AddPlayersDrawer sort)
**Method:** tdd
**Approach:** new `fetchPlayerRoundCountsByGameType(gameTypeId, { seasonId? })` in `lib/api/read.ts` returning `Map<number, number>`. In `GameViewPage.tsx`, swap `gameRoundCountByPlayerId` (per-game) for the new query (per-game-type, with active season for basketball). `rounds-desc` sort in `SortablePlayerList` already does the right thing; just gets correct data.
