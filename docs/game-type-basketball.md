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
- **`basketballLedgerScale`**: the constant multiplier in effect when the round was saved (defaults to the app’s `DEFAULT_BASKETBALL_LEDGER_SCALE` if missing on old rows).

Validation rules:

- The two teams are **disjoint**.
- Each team has **at least one** player.
- Team lists include only players who participated in that round.
- Unlocked players not listed on either team are treated as **not playing** for that round and are excluded from round entries/point calculation.

---

## OpenSkill replay

Skill is tracked with **openskill.js** (default prior: `mu = 25`, `sigma ≈ 8.33` per player).

1. Start with an empty rating map.
2. For each **prior** basketball round in this game, in **ascending `round_number`**, apply one two‑team update with
  `rate([teamA, teamB], { score: [scoreTeamA, scoreTeamB] })`.
3. For the **new** round, record each participant’s **ordinal** before the update (`ordinal = mu − 3·sigma`, same as `openskill.ordinal`).
4. Apply the same `rate` call for the new match and read ordinals **after** the update.

Locked players do not appear in new rounds but still participate in the replayed state from earlier rounds.

---

## Mulberry `pointDelta` (zero‑sum, ~10–20 swing)

Let `ledgerScale` be `round.metadata.basketballLedgerScale` when re‑deriving a stored round, otherwise **`DEFAULT_BASKETBALL_LEDGER_SCALE`** (currently **7**) for new calculations.

For each player in this round’s roster:

1. `scaled = (ordinal_after − ordinal_before) × ledgerScale`
2. Round each value to **two decimal places**.
3. Subtract the **mean** of those rounded values across **all participants** so the set sums to zero before the remainder fix.
4. Apply a **single two‑decimal remainder fix** on the first participant (same pattern as Dixit) so stored entries sum to **exactly** zero.

The **`ledgerScale`** is chosen so a fresh **2v2 game to 11 with a modest margin** (for example 11–7) yields roughly **10–16** points per player on the winning side (and the symmetric loss on the other side) after centering—large enough for settlement, still driven by OpenSkill and score margin.

---

## Round summary

The machine summary includes the scoreline and per‑player deltas (by id). The UI typically saves a human‑readable `summary_text` with display names.

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

The app compares each friend vector to a **static pool** of ~60 NBA and WNBA
names. Curator input is stored in
`src/features/dashboards/basketball/nbaComparisonPool.source.json`: each row
has a human-readable **`primeWindow`** plus two halves:

- **Stats-like half** (`statsPrime`): `winImpact`, `overperformance`,
  `clutchDelta`, `consistency` — intended to summarize a **best three-season
  prime** in plain language, still as hand priors (not live API stats).
- **Narrative half** (`narrative`): `carryBias`, `upsetFactor`, `chemistryBias`,
  `personaIntensity` — loose archetype / roleplay vibe for the same eight axes
  on the friend side.

`src/features/dashboards/basketball/nbaComparisonPool.build.ts` **merges** those
into the runtime `ComparisonVector`: the four stats priors become **within-pool
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
break toward continuity without breaking uniqueness.

### Editing or refreshing the pro list

1. Edit `nbaComparisonPool.source.json` (keep ~60 entries unless you also tune
   thresholds and copy).
2. Run `node scripts/validate-nba-pool-source.mjs` to sanity-check shape, ids,
   and count.
3. Rebuild / run tests; the bundled app imports the JSON at compile time.

Design notes and algorithm history: `docs/nba-comp-design.md`.

---

## Reproducibility

OpenSkill replay for round *n* depends only on prior rounds’ **teams + scores** (not on past Mulberry deltas).

Re‑deriving round *n*’s Mulberry deltas from history needs:

- Prior basketball metadata (teams + scores) in order,
- The same **`ledgerScale`** as stored for round *n* (pass `ledgerScale` into `calculateBasketballRound` when auditing).