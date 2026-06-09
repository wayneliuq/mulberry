# Product Brief: Leaderboard noise filter & per-game-type round sort
_Slug: leaderboard-noise-and-sort · Date: 2026-06-08 · Autonomy: auto_

## 1. Working backwards (≤5 sentences, release-note voice)
The basketball leaderboard now only surfaces players who have logged more than 10 rounds in the active or future seasons, removing the noise from one-time drop-ins while keeping historical seasons fully readable. When adding players to a round in any game mode, the player list now orders by how many rounds each player has played in that exact game type (the same window the leaderboard uses for its round counts), with 0-round players still visible at the bottom and the existing player-id tiebreaker preserved.

## 2. What the user does / sees

**Who is the user of this feature:** Mulberry players and admins who add players to rounds (any game type) and who browse the basketball leaderboard.

### D1 — Basketball player leaderboard hides sub-11-round players in current and future seasons
**How a user verifies:**
1. Open the basketball leaderboard while the active season is selected.
2. Confirm that every visible player row's combined Won + Lost rounds is greater than 10.
3. Open a prior basketball season from the season selector and confirm that historical-season rows still include players with 10 or fewer rounds.
4. Switch the leaderboard filter to a non-basketball game type and confirm the filter does not apply (it is basketball-only).

### D2 — Add-players drawer sorts by rounds played in the target game type
**How a user verifies:**
1. Open any game's **Add players** drawer (any game type — basketball, dixit, texas hold'em, etc.).
2. Confirm the default sort orders players by how many rounds they have played in that same game type (the window the leaderboard uses), not just the current game.
3. Confirm that players with 0 rounds in that game type still appear, sit at the bottom, and are tie-broken by player id ascending (the same tiebreaker the drawer uses today).

## 3. Success signal
A user opening the active basketball leaderboard sees zero rows with 10 or fewer rounds played, and a user opening the Add-players drawer in any game type sees the top of the list match the leaderboard's per-game-type round counts.

## 4. Boundaries
**In scope:**
- Filter applied to **player** rows in the basketball leaderboard; applies to the active season and any future season; does not apply to historical (closed) basketball seasons.
- Filter does not apply to the family leaderboard, non-basketball leaderboards, or any other surface.
- Add-players drawer in `GameViewPage` switches its rounds sort input from per-game (current game only) to per-game-type (the same window the leaderboard uses).
- For basketball, the per-game-type window is the active season; for other game types it is all games of that type.

**Out of scope:**
- A user-facing toggle for the filter (it is a hard rule, not a setting).
- Changing the existing dashboard thresholds (which are statistical-significance gates for carry/clutch/etc., not a leaderboard rule).
- Family leaderboard rows.
- Past basketball season leaderboards.
- Non-basketball game leaderboards.

**Anti-goals (philosophy-level — we deliberately will not):**
- We will not silently filter historical season data.
- We will not hide family aggregate rows.
- We will not collapse the 0-round players in the Add-players drawer — they remain visible at the bottom.

## 5. Decisions
| Decision | Choice | Status |
|---|---|---|
| Threshold for the leaderboard player filter | `LEADERBOARD_MIN_ROUNDS = 10`; player is shown only when `roundsWon + roundsLost > 10` | `[HARD DECISION]` |
| Season scope of the filter | Active season and any season with `id > activeSeasonId` (current + future); seasons with `id < activeSeasonId` keep the unfiltered view | `[HARD DECISION]` |
| Family leaderboard scope | Family rows are not affected by the filter | `[HARD DECISION]` |
| Add-players sort source | Per-game-type round count from the same window the leaderboard uses; for basketball, the active season | `[HARD DECISION]` |
| 0-round players in Add-players | Still shown, at the bottom, with the existing player-id-ascending tiebreaker | `[HARD DECISION]` |
| Where the leaderboard filter lives | Inside `fetchLeaderboards` so all consumers (LeaderboardsPage) see the same filtered data; gated by an `applyMinRoundsFilter` option | settled |
| Where the per-game-type round counts come from | A new lightweight `fetchPlayerRoundCountsByGameType` reader in `lib/api/read.ts`; do not piggyback on the heavy `fetchLeaderboards` query from the game view | settled |

## 6. Risks & unknowns
- A season that has just rolled over (activeSeasonId changes) — confirm the previous season's leaderboard view immediately drops the filter. (Mitigation: filter is keyed on `selectedSeasonId` vs `activeSeasonId`; the active season is the only one that filters.)
- A user viewing a hypothetical future season (does not exist today but could post-rollover) — the filter must apply.
- A player whose only rounds were in a past season is correctly absent from the active-season leaderboard once the filter is on; this is the desired behavior but may surprise users who expected to see themselves.
- The new per-game-type round-counts query is a new Supabase read; verify it does not regress load time on the game view.

## 7. References & revision log
**Document references:**
- Architecture: `docs/game-type-basketball.md`
- UX/PMF: `docs/nba-comp-design.md` (out of scope for this change but the broader dashboard rule set lives here)
- Security policy: none
- Schema/ERD: `supabase/migrations/` (no schema change for this work)

**Revision log:**
- v0.1 · 2026-06-08 · initial draft
