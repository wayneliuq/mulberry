# NBA Comp — Design Notes & Handoff

Working notes for the "Who You Play Like (NBA)" feature on the basketball
dashboard. Captures the current algorithm, the recent weight/dimension
changes, and the next two pieces of work (stability system + pool refresh).
Update this file as decisions land — it's the source of truth for design
intent, not a spec.

## Code layout

| Concern | File |
|---|---|
| Matching logic, NBA pool, vectors, fit | `src/features/dashboards/basketball/nbaComparisons.ts` |
| Thresholds (eligibility, sample minimums) | `src/features/dashboards/basketball/constants.ts` |
| Dashboard aggregator (calls comparison) | `src/features/dashboards/basketball/compute.ts` |
| Friend/round types | `src/features/dashboards/basketball/types.ts` |
| OpenSkill win-prob model (reused) | `src/features/game-types/basketball.ts` |
| Table UI + color thresholds | `src/features/dashboards/components/NbaComparisonTable.tsx` |
| Tests | `src/features/dashboards/basketball/compute.test.ts` |

## Current algorithm (post commit `9156430`)

### 1. Eligibility

A friend qualifies if they have ≥ `PLAYER_MIN_ROUNDS` (20) decisive rounds
in the analyzed window.

### 2. Raw stats per friend (`gatherFriendRawStats`)

Computed from `NormalizedRound[]`:

- `winRate` — wins / (wins + losses) over decisive rounds.
- `clutchDelta` — close-game (margin ≤ 2) win rate minus overall win rate.
  Null only if zero close games.
- `carryBias` — win rate with lower-ranked teammates minus win rate with
  higher-ranked teammates (rank = cumulative point-delta). Null only if
  either bucket is empty.
- `volatility` — population stdev of per-round point-delta.
- `upsetRate` — wins / opportunities, where an opportunity is a round
  whose pre-round OpenSkill win prob was < 40%. Null only if zero
  opportunities.
- `maxComboLift` — for any qualifying pair (≥ 8 together, ≥ 8 apart on
  each side), the best win-rate lift when teamed. Null if no qualifying
  pair.
- `teammateEntropy` — Shannon entropy of teammate-frequency distribution.
- `overperformance` *(new)* — mean of
  `(1_if_win_else_0) − openSkillPreRoundWinProb` across all decisive rounds.
  Null only if zero decisive rounds.

We also emit sample sizes for clutch / carry / upset / overperformance so
the next stage can shrink toward neutral instead of using a hard 0.5 fallback.

### 3. Normalize to 8-dim style vector in [0, 1] (`rawToComparisonVector`)

```
winImpact        = clamp01(winRate)
carryBias        = shrink( (carryBias + 1) / 2,        carrySampleSize,        8 )
consistency      = clamp01( 1 − volatility / cohort_max_volatility )
clutchDelta      = shrink( (clutchDelta + 0.35) / 0.7, clutchSampleSize,        8 )
upsetFactor      = shrink( upsetRate,                  upsetOpportunities,      6 )
chemistryBias    = 0.55·(teammateEntropy / cohort_max_entropy)
                   + 0.45·((maxComboLift + 0.35) / 0.7)
personaIntensity = 0.35·upsetIntensity + 0.25·volNorm
                   + 0.20·|carryExtreme| + 0.20·|clutchExtreme|
overperformance  = clamp01( (overperformance + 0.25) / 0.5 )
```

Where `shrink(scaled, n, threshold) = clamp01( w·scaled + (1−w)·0.5 )`
with `w = min(1, n / threshold)`. This replaces the previous hard "if
below threshold use 0.5" rule — sparse-data friends now contribute partial
signal instead of being pinned to the center of heavy axes.

`consistency` and the diversity half of `chemistryBias` are normalized to
the **friend cohort** (max in this run), not to a fixed scale.

### 4. Distance & fit

Weighted squared-Euclidean, then `fit = 1 / (1 + distance)`.

```
distance = sqrt( Σ_k weights[k] · (friend_k − nba_k)² )
```

Weights (current):

| Dimension | Weight |
|---|---|
| winImpact | 1.30 |
| carryBias | 1.20 |
| upsetFactor | 1.15 |
| overperformance | 1.05 |
| clutchDelta | 1.00 |
| consistency | 0.95 |
| chemistryBias | 0.90 |
| personaIntensity | 0.45 |

UI color thresholds (`NbaComparisonTable.tsx`):
green > 0.66, neutral 0.45–0.66, red < 0.45.

### 5. Assignment — global greedy bipartite

`assignUniqueGreedy`: build all friend × NBA edges with their distances,
sort by distance ascending, walk the list taking each edge whose friend
and NBA player are both still unassigned. Each NBA name is used at most
once per friend cohort.

This runs fresh on every dashboard load — no persistence today. This is
the source of the churn problem the stability system addresses.

### 6. NBA pool

Static, hand-curated array `NBA_COMPARISON_PLAYER_POOL` (currently 45
entries, all with 8-dim vectors). Vectors are explicitly "coarse fun
priors," not derived from real NBA stats.

## Recent changes (commit `9156430`)

Goal: sharpen differentiation between friends without changing the basic
flow.

- Bumped weights on win-related axes (winImpact, carryBias, clutchDelta,
  upsetFactor); nudged personaIntensity down.
- Added `overperformance` dimension (weight 1.05) so the model captures
  "are you the reason your team wins?" — orthogonal to raw winRate.
- Replaced hard 0.5 sub-threshold fallbacks with linear shrinkage so
  partial-data friends still contribute proportional signal.
- Added curated `overperformance` priors for all 45 existing pool entries.

**Known side effect:** total vector weight grew ~23% (6.45 → 7.95), so
absolute fit scores drift down a bit. UI color thresholds are absolute,
so more friends may land in yellow/red than before. We agreed to wait
and see real data before adjusting thresholds or renormalizing weights.

## Pending: Stability system

### Problem

Today the global greedy re-runs on every dashboard load. One new round of
data can re-shuffle several friends' NBA matches simultaneously, which
kills the "this is *my* NBA player" sense of identity.

### Agreed design (hysteresis + stickiness)

**Two layers, both client-side:**

1. **Hysteresis on the friend vector.** Persist each friend's
   `last_anchored_vector` (the vector at the last time their match
   changed). On each compute, only re-run the match if
   `‖fresh_vector − last_anchored_vector‖ > τ` for that friend.
   `τ` is small but non-zero — a single round of noise shouldn't trip it;
   a big upset or sustained drift should. Calibration will need a few
   real-data passes.

2. **Stickiness bonus inside the distance calc.** When computing
   `distance(friend, currentNbaForThisFriend)`, multiply by `(1 − stickiness)`
   (e.g., `stickiness = 0.15`). The global greedy still runs whenever
   hysteresis trips, so quality stays near-optimal — but a friend has to
   drift meaningfully further from their current NBA before another wins.

Why not the original "leftover-only" rule? Path-dependent lock-in: the
first-ever assignment becomes optimal and every subsequent change is
constrained to leftovers. Quality decays over time, late-joiners get the
bottom of the pool, and we'd need a release/repair policy for retired
friends or pool churn. Stickiness gives ~80% of the fondness with none of
the lock-in.

### Persistence

Decision: **client-side only** (user-confirmed).

Implication: state is per-device, per-browser. Switching devices or
clearing site data resets to a fresh global match. That's an acceptable
trade for now — the goal is "feels stable across a normal week of play,"
not "stable across reinstalls."

Storage: `localStorage` keyed by something stable (e.g.,
`mulberry:nba-comp:v1`). Shape suggestion:

```ts
type Anchor = {
  friendId: number;
  vector: ComparisonVector;        // last_anchored_vector
  nbaId: string;                   // current match
  anchoredAt: number;              // ms epoch, for debugging/decay
};
type AnchorStore = Record<number, Anchor>;  // by friendId
```

### Open tuning knobs

- `τ` (hysteresis threshold): start ~0.05 weighted L2 on the 8-dim vector.
- `stickiness`: start 0.15. Higher = stickier; cap at maybe 0.25 before
  matches feel artificially frozen.
- Tie-breaking when multiple friends qualify for a swap in the same pass:
  process in deterministic order (e.g., friend id ascending), let the
  greedy fall out naturally.

### Edge cases to handle

- **New friend (no anchor):** fresh global greedy slot for them; the rest
  keep their anchors unless their hysteresis trips.
- **Friend stops qualifying** (drops below 20 rounds): release their
  anchor, free up their NBA name.
- **Pool change** (NBA player added/removed): if a friend's anchored
  `nbaId` is no longer in the pool, treat as a forced re-match.
- **Storage missing/corrupt:** treat as cold start — full global greedy.

## Pending: Pool refresh

User requirements captured live in conversation:

- **GOATs** to include explicitly: LeBron James, Michael Jordan, Stephen
  Curry, Yao Ming, Caitlin Clark, Angel Reese, Sabrina Ionescu.
  *(Note: Caitlin Clark, Angel Reese, and Sabrina Ionescu are WNBA — the
  current pool is NBA-only. Decision pending: rename feature to "Basketball
  comp" so WNBA fits, or treat WNBA stars as a special bucket inside the
  same pool? See "Open questions" below.)*
- **Target size:** ~60 entries.
- **Mix:** roughly 4:1 famous:infamous. The 1/5 "infamous" picks should
  be for laughs — characters with strong on-court personalities (think
  trash talkers, hot-and-cold flame-outs, polarizing role players),
  not necessarily *bad* players.
- **Composition (rough split):** GOATs above + currently active stars,
  All-Stars, notable role players — pool should feel current as of
  the season this dashboard is meant to celebrate.
- **Vector quality:** as data-grounded as we can make it within the
  8-dim space we have. We won't get real PPG/efficiency since the
  pool dims are derived from team-success-style signals, but the
  priors should at least *order* sensibly within each dim.

### Suggested vector-setting heuristics

For each NBA player, set each dim by anchoring against archetypes:

- `winImpact` ≈ how much their teams win when they're on the court.
  Anchor: prime LeBron / Jokić / Curry ~0.90; All-Star-but-not-MVP
  ~0.80; mid-tier starter ~0.70; bench/role ~0.55–0.65.
- `carryBias` ≈ do they elevate worse teammates more than they need
  great ones? High: LeBron, Jokić, Luka, Giannis, Westbrook (in OKC).
  Low: stars who needed co-stars (Klay, Bam in some lineups).
- `consistency` ≈ low game-to-game variance, low injury volatility.
  High: Duncan-era role models, Kawhi (on-court), Jokić. Low:
  Westbrook, Ja, Zion.
- `clutchDelta` ≈ reputation in close games. High: Dame, Curry, Kobe,
  Kyrie. Low: Giannis (FT struggles), Embiid (playoff history).
- `upsetFactor` ≈ do they show up against tougher opponents? High:
  Jimmy Butler, peak LeBron, Curry. Low: stat-padders on bad teams.
- `chemistryBias` ≈ make-teammates-better quotient. High: Jokić,
  CP3, Draymond, Haliburton, Sabonis. Low: ball-stoppers, iso-heavy
  scorers.
- `personaIntensity` ≈ memorable on-court character / unpredictability.
  High: Draymond, Westbrook, Dillon Brooks, Beverley, Smart, Ja.
  Low: Kawhi, Tatum, Jokić (laid-back).
- `overperformance` ≈ team wins more than rosters predict. High:
  LeBron-in-Cleveland, Jokić, Jimmy in Miami, peak Curry.
  Low: empty-cal scorers on bad teams.

These are subjective priors — the goal is internal consistency, not
literal accuracy.

### Open questions

1. **WNBA inclusion.** The current code names the section "Who You Play
   Like (NBA)". Caitlin / Angel / Sabrina pull us off NBA-only.
   Options:
   a) Rename section to "Basketball" / "Pro Basketball"; WNBA stars sit
      naturally in the same pool. Cleanest UX.
   b) Keep NBA-only and rotate WNBA into a separate, smaller pool with
      its own assignment pass.
   c) Add WNBA names but keep the section title; live with the inaccuracy.
   Recommendation: **(a)** — minimum code, no user confusion.
2. **Existing pool churn.** Pool will grow from 45 → ~60. Do we replace
   any current entries (e.g., legacy "infamous" picks that don't read
   right anymore) or only add? Recommendation: **prune ~5, add ~20** to
   land at 60, keep recognizable.
3. **Display name handling for WNBA.** Display names are free text in
   the pool entry; no DB schema impact.

## Open questions across the whole feature

- **NBA pool vectors are still hand-authored priors.** The whole stack
  sits on subjective values. We could revisit by deriving NBA vectors
  from real stats once we identify analogs for each dim (e.g.,
  win-shares for winImpact, on/off splits for carryBias). Punt until
  pool refresh lands.
- **Cohort-relative normalization** of `consistency` and the diversity
  half of `chemistryBias` means a friend's match shifts when the friend
  list changes — even with the same gameplay. Hysteresis will hide some
  of this; if it surfaces, consider switching to fixed-scale
  normalization.
- **UI fit-score color thresholds** are absolute. The recent weight bump
  pushes scores down ~10–15%. Watch real data before adjusting.

## Cheatsheet for next session

If you're picking this up cold, do these in order:

1. Read `src/features/dashboards/basketball/nbaComparisons.ts` end to end.
2. Skim `src/features/dashboards/basketball/compute.test.ts` to see
   what's covered.
3. Decide on the WNBA naming question above (blocks pool refresh).
4. Implement the stability system (hysteresis + stickiness) — it's
   smaller and doesn't depend on the pool work.
5. Refresh the pool to ~60 entries per the requirements above.
6. Add tests: a) stickiness keeps the same match when distance change is
   small; b) hysteresis re-runs the match when the friend vector moves
   past τ; c) a missing/corrupt anchor store falls back to full greedy.
