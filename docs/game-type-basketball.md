## Basketball – Points & Rounds

This document explains **how points are calculated** for the **Basketball** game type (OpenSkill-backed rating).

Each Mulberry **round** is one pickup game to a target score (for example 11 with 1s and 2s, or 21 with 2s and 3s). Players can be on different teams in different rounds; each round can also bench players.

---

## Game settings

- **`point_basis`** is always **1** for basketball games (enforced on create, on settings update, and by migration). It is **not** used to scale OpenSkill into the ledger.
- **`money_per_point_cents`** still converts stored point totals to settlement money like other game types.

---

## Manual input (secondary)

The default round form uses team assignments and final scores (below).

**Manual input** assigns team A/B, then enters per-player deltas for rostered players only. It uses the shared manual rules in `docs/rules.md`. Rounds are tagged `metadata.manualInput: true` and **omit** `scoreTeamA` / `scoreTeamB`, so they do not feed OpenSkill history or basketball dashboards that require scores.

---

## Raw round input (source of truth)

Each round stores, in the round `settings_snapshot.metadata` (and mirrored in round-entry metadata for traceability):

- **`mode`**: `"basketball"`.
- **`teamAPlayerIds`**, **`teamBPlayerIds`**: rosters for that game.
- **`scoreTeamA`**, **`scoreTeamB`**: non‑negative integer totals.
- **`basketballLedgerScale`**: the constant multiplier in effect when the round was saved (defaults to the app’s `DEFAULT_BASKETBALL_LEDGER_SCALE` if missing on old rows). Recorded for audit; it has been `7` for every round to date and nothing reads it back.
- **`basketballHousePointDelta`**: the round’s balancing house line (see below). Present on OpenSkill‑scored rounds only.

Validation rules:

- The two teams are **disjoint**.
- Each team has **at least one** player.
- Team lists include only players who participated in that round.
- Unlocked players not listed on either team are treated as **not playing** for that round and are excluded from round entries/point calculation.

---

## Team presets (pick teams)

Admins can auto-balance **unlocked** players into Team A and Team B from the game view **Pick teams** control. The client:

1. Replays OpenSkill for the **selected basketball season** (same history source as new-round scoring).
2. Partitions unlocked players into the chosen number of teams, under two objectives in strict priority order:
   - **Even player counts — hard constraint.** Team sizes differ by at most one (`floor(N/K)` or `ceil(N/K)`). 8 players over 2 teams is 4v4, never 3v5; 8 over 3 teams is 3/3/2. Uneven splits are never considered, however much better their skill balance would be.
   - **Skill balance — best effort.** Among the evenly sized candidates, pick the closest match: win probability nearest 50/50 for two teams, minimum variance of team mean ordinals for three or more. A lopsided roster can still leave one side favoured; that is accepted.
3. Saves the result via `save_basketball_team_preset` (admin-write).

Presets are stored in **`basketball_team_presets`** per game:

| Column | Meaning |
|--------|---------|
| `label_number` | Monotonic per game (`1`, `2`, `3`, …); gaps remain after FIFO eviction |
| `team_a_player_ids`, `team_b_player_ids` | Roster at save time (unlocked players only) |
| `team_a_win_prob` | OpenSkill `predictWin` for Team A before the hypothetical match |

**Retention:** at most **10** presets per game. An 11th insert deletes the **oldest** row by `created_at`. Writes require an open basketball game and pass the same roster validation as basketball round metadata (disjoint teams, no duplicates, unlocked roster only). Reads are public; writes go through admin-write only.

In the **round form**, numbered pills (one per saved preset) quick-fill Team A/B assignments. Deselecting a pill resets unlocked players to **none**. Manual team edits clear the active preset selection.

---

## OpenSkill replay

Skill is tracked with **openskill.js** (default prior: `mu = 25`, `sigma ≈ 8.33` per player).

1. Start with an empty rating map.
2. For each **prior** scored basketball round in the **active season** (chronological order across all games), apply one two‑team update with
  `rate([teamA, teamB], { score: [scoreTeamA, scoreTeamB] })`.
3. For the **new** round, record each participant’s **ordinal** before the update (`ordinal = mu − 3·sigma`, same as `openskill.ordinal`).
4. Apply the same `rate` call for the new match and read ordinals **after** the update.

Locked players do not appear in new rounds but still participate in the replayed state from earlier rounds.

---

## Mulberry `pointDelta` (true OpenSkill ledger)

Let `ledgerScale` be **`DEFAULT_BASKETBALL_LEDGER_SCALE`** — a fixed constant, currently **7**. `calculateBasketballRound` accepts a `ledgerScale` override for auditing, but nothing in the app passes one.

For each **real** (non‑ghost) player in this round’s roster:

```
pointDelta = ledgerScale × (ordinal_after − ordinal_before)
```

That is the whole formula. In particular:

- **No game‑length scaling and no margin scaling.** OpenSkill reads only win / loss / tie from the score, so 11–0, 11–9, 7–5 and 17–14 all produce identical deltas for the same rosters. The **“1s & 2s” vs “2s & 3s”** setting is **metadata only** and does not affect points.
- **No rounding and no mean‑centering.** Values keep full double precision; only display code rounds to 2dp. Rounding or re‑centering per round would break the property below.

### Ghost players

**Ghost** (non‑qualifying filler) players count toward OpenSkill team strength but receive a ledger delta of **exactly 0**. Their raw OpenSkill movement is absorbed by the house, **not** redistributed to teammates — redistributing it would decouple a real player’s total from their ordinal.

Ghosts are flagged by `players.is_score_neutral_hidden` and are **excluded from every player-facing read**: leaderboards, family aggregates, and both dashboards (basketball and Fight the Landlord). Zeroed ledger entries are not enough on their own — a ghost still appears in stored round rosters and round entries, and the dashboards label unknown ids with the raw id, so a ghost used to surface as a "player" named after its own row id. The dashboard fetchers therefore return a `ghostPlayerIds` list alongside the data, and the compute layer strips those ids from rosters, participant lists and entry maps **before** anything is counted or labelled. A round a ghost filled in on is analysed as the smaller lineup it effectively was.

### The house line

OpenSkill updates are Bayesian and **not zero‑sum**, so the players’ deltas do not sum to zero on their own. Each round therefore records a balancing line in `settings_snapshot.metadata.basketballHousePointDelta`:

```
houseDelta = −(sum of all player deltas)     // including the ghosts' absorbed share
```

The house is **never a player entry** — it exists only in round metadata. `admin-write` enforces `sum(entries) + houseDelta ≈ 0` on create.

### Why this matters

Because each round’s delta telescopes, a player’s **cumulative** Mulberry points equal

```
ledgerScale × (their current OpenSkill ordinal − their starting ordinal)
```

so the **points leaderboard ranks players in exactly the same order as the OpenSkill ordinal**. This is the whole point of the design, and it is why `round_entries.point_delta` is stored as `double precision` (see `20260921000000_point_delta_precision.sql`): a `numeric(p,s)` column re‑quantizes every row and can reverse a near‑tie.

### Settlement caveat

Because scored basketball rounds are not player‑zero‑sum, a basketball game’s player point totals do **not** sum to zero. `calculate_settlement` requires a zero total for money games, so a basketball game with `money_per_point_cents > 0` cannot currently be settled. Zero‑money basketball games settle normally.

---

## Round summary

The machine summary includes the scoreline, per‑player deltas (by id), and the house line. The UI saves a human‑readable `summary_text` with display names, also ending in the house line.

---

## Basketball seasons

Basketball stats (rounds, leaderboards, dashboards, skills, rankings) are scoped to **seasons**.

- **Season 1** contains all historical basketball data through the first rollout boundary.
- Later seasons follow fixed solstice windows in `America/Los_Angeles`:
  - Summer: **Jun 21 → Dec 20** (half-open; next season starts Dec 21)
  - Winter: **Dec 21 → Jun 20** (half-open; next season starts Jun 21)
- Each basketball round stores `basketball_season_id` on `rounds`.
- Player identity is global; leaderboards/dashboards only list players with activity in the selected season.
- The basketball player leaderboard hides any player with `roundsWon + roundsLost ≤ 10` (i.e. fewer than 11 rounds) when viewing the active or any future season. Historical (closed) basketball seasons keep the unfiltered view. The threshold is the shared `LEADERBOARD_MIN_ROUNDS` constant; the filter does not apply to the family leaderboard or to other game types.
- Season UI (selector, next-season notice, admin rollover) appears only in basketball views.
- NBA comp anchor `localStorage` is namespaced per season (`mulberry:nba-comp:v1:season-<id>`).

Auto-rollover runs via `ensure_basketball_season_active()` when seasons are loaded. Admins can force early rollover with **Start next season** (calls `force_basketball_season_rollover()`).

---

## Basketball dashboard (pickup analytics)

Beyond OpenSkill and Mulberry points, the **basketball game dashboard** can show
ranked behavioral metrics and a **“Who You Play Like (Pro Basketball)”** table
when enough decisive rounds exist in the selected window.

### Friend style vector

For each eligible friend, Mulberry derives an **8-axis style vector** in \([0, 1]\)
from pickup history (win impact, carry bias, consistency, clutch tendency,
upset factor, chemistry, persona intensity, and a separate “overperformance”
signal). Values are **cohort-relative** within that friend group for the
window (not league-wide NBA stats). The implementation lives in
`src/features/dashboards/basketball/nbaComparisons.ts` (`gatherFriendRawStats`,
`rawToComparisonVector`).

### Pro pool and distance

The app compares each friend vector to a **static pool** of ~80 NBA and WNBA
names. Curator input is stored in
`src/features/dashboards/basketball/nbaComparisonPool.source.json`: each row
has a human-readable **`primeWindow`** plus two halves:

- **Stats-like half** (`statsPrime`): `winImpact`, `overperformance`,
  `clutchDelta`, `consistency`, `swingMagnitude`, `marginSpread`,
  `chalkReliability`, `ledgerAsymmetry` — intended to summarize a **best three-season
  prime** in plain language, still as hand priors (not live API stats).
- **Narrative half** (`narrative`): `carryBias`, `upsetFactor`, `chemistryBias`,
  `personaIntensity` — loose archetype / roleplay vibe for the same eight axes
  on the friend side.

`src/features/dashboards/basketball/nbaComparisonPool.build.ts` **merges** those
into the runtime `ComparisonVector`: the eight stats priors become **within-pool
percentile ranks** (average-rank tie handling) so pros spread across the stats
axes; the four narrative priors are used **directly** (clamped to \([0, 1]\)).
Matching is **closest weighted Euclidean** distance, with **one pro per friend**
and **no pro reused** within the cohort (global greedy assignment in
`nbaComparisons.ts`).

### Stability (anchors)

To reduce match churn when new rounds nudge vectors slightly, the dashboard can
**persist an anchor** per friend (last matched pro id + snapshot vector) in
browser `localStorage` under the key `mulberry:nba-comp:v1` (see
`NBA_COMP_ANCHOR_STORAGE_KEY` in `constants.ts`). If the friend’s fresh vector
stays within a **hysteresis band** around the saved vector and the pro is still
free, the same pro is kept; otherwise the friend re-enters the greedy pool.
**Stickiness** inflates greedy distance slightly toward the previous pro so ties
break toward continuity without breaking uniqueness. When a pro assignment changes,
the prior pro is stored as **`previousNbaId`** on the anchor and shown on every
later load until the next change. The **2–3 rows with the most recent pro
assignment** (first time in the table or a rematch) get a subtle ★ and **New** pill.

### Editing or refreshing the pro list

1. Edit `nbaComparisonPool.source.json` (keep ~80 entries unless you also tune
   thresholds and copy).
2. Run `node scripts/validate-nba-pool-source.mjs` to sanity-check shape, ids,
   and count.
3. Rebuild / run tests; the bundled app imports the JSON at compile time.

Design notes and algorithm history: `docs/nba-comp-design.md`.

---

## Reproducibility

OpenSkill replay for round *n* depends only on prior rounds’ **teams + scores** (not on past Mulberry deltas).

Re‑deriving round *n*’s Mulberry deltas from history needs only the prior basketball metadata (teams + scores) in chronological order. The scale is the fixed `DEFAULT_BASKETBALL_LEDGER_SCALE`; pass an explicit `ledgerScale` into `calculateBasketballRound` only if auditing a round saved under a different constant.

`scripts/recalculate-season.ts` does exactly this for a whole season. It **skips manual‑input rounds** (hand‑entered deltas are not ours to re‑derive) while still feeding them into the replay on the same terms as the live app.