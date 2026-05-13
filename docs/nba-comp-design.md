# NBA Comp — Design Notes & Handoff

Working notes for the "Who You Play Like (Pro Basketball)" feature on the basketball
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

Static, hand-curated array `NBA_COMPARISON_PLAYER_POOL` (currently 60
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
- Added curated `overperformance` priors for all pool entries.

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

### Resolved decisions (2026-05-12)

1. **WNBA inclusion: include in the same pool, rename the feature copy.**
   We will keep one shared "pro basketball" comparison pool and rename
   user-facing text from NBA-only language to avoid mismatch.
   - Section title target: `Who You Play Like (Pro Basketball)`.
   - Internal ids/types can stay as-is for now (`nbaComp`, `nbaId`) to
     avoid broad churn; we can rename symbols later in a dedicated cleanup.
2. **Pool churn strategy: rebalance to ~60 total with controlled pruning.**
   We will not only add names. Plan:
   - Remove ~5 entries that are currently redundant/low-recognition.
   - Add ~20 entries (GOATs + active stars + role/chaos picks) to land near 60.
   - Keep the 4:1 famous:infamous mix target.
3. **Display names for WNBA entries: no schema changes.**
   Pool entries are static text labels; no API or DB migration required.
4. **Copy update required in constraints/explainer text.**
   Any line saying "NBA-only" should move to "pro basketball comp pool"
   wording so users do not infer exclusion.

## Critical review: gaps and mitigations

### 1) Assignment quality risk: greedy can miss better global pairings

Current assignment is deterministic and fast, but `assignUniqueGreedy`
is not guaranteed to minimize total distance globally. Most cohorts are
small enough that this is acceptable, but it can produce "obviously odd"
pairings in edge cases, especially after adding stickiness.

**Mitigation now:** keep greedy (simple and stable), then run a cheap
2-swap local improvement pass over assigned pairs. If swapping two NBA
names lowers total distance, take the swap; repeat until no improvement.
This keeps complexity low while catching many greedy misses.

### 2) Stability vs quality risk: hysteresis can freeze outdated matches

The planned stability layer improves identity, but if thresholds are too
high, a friend can stay stuck with an outdated comp for too long.

**Mitigation now:** add a "max stale age" guardrail (e.g., force re-anchor
after 30 days or after N qualifying rounds since anchor) even if
hysteresis does not trip. This prevents permanent lock-in.

### 3) Cohort-relative normalization introduces social drift

`consistency` and part of `chemistryBias` depend on cohort max values.
A friend's vector can change when other friends join/leave, even with
unchanged personal play.

**Mitigation now:** keep current behavior plus hysteresis.  
**If drift is user-visible:** switch to robust fixed scaling
(e.g., pre-chosen caps or rolling percentile anchors) for those axes.

### 4) Explainability gap in UI

Users only see name + fit score. Without "why", low-trust outcomes can
feel random, especially when matches change.

**Mitigation now:** show top-3 driving dimensions for each match
(e.g., "clutch + carry + upset") with simple labels. Keep numeric detail
behind a tooltip to avoid overloading casual users.

### 5) Calibration gap for fit-score colors

Color thresholds are static while distance weights changed materially.
This can unintentionally make the board feel "worse" (more yellow/red)
without actual quality decline.

**Mitigation now:** track distribution snapshots after release:
median fit, p25/p75, and % in each color band. Re-tune thresholds only
after real-data observation, not by intuition.

### 6) Test gap for upcoming stability logic

Current tests verify uniqueness/determinism and section rendering, but
not anchored-state transitions.

**Required tests when stability lands:**
- unchanged anchor when vector drift < `tau`,
- rematch when drift > `tau`,
- stickiness preference when distances are close,
- forced rematch when anchored `nbaId` disappears,
- corrupt/missing storage fallback behavior.

## Open questions across the whole feature

- **Should we support "manual lock" per friend?** Useful for delight
  ("I am always Curry"), but can hurt model integrity. Default: no lock
  in v1; revisit if users request it.
- **Should we surface confidence?** A fit number without confidence can
  overstate certainty for low-sample players. Likely yes via a simple
  confidence badge tied to sample size and shrink weight.

## Endearing/fun improvements (without sacrificing trust)

1. **Comp card + tagline.** Add a short generated-style but deterministic
   tagline from vector archetypes ("Chaos closer", "Quiet engine", etc.).
2. **Rival comp reveal.** Show one "your funniest near-miss" comp
   (second-best fit) in a collapsed row for social conversation.
3. **Sticky identity moments.** When a comp changes after threshold trip,
   show "promotion/rebrand" microcopy ("upgraded from X -> Y") with date.
4. **Duo storyline.** Add optional pair comps ("you two are Splash Bros /
   Lob City vibes") using existing pair metrics; this is often more social
   than solo comp.
5. **Era flavor toggle.** Let users view "modern-heavy" vs "all-era" pools
   without changing core algorithm (just different candidate pool).
6. **Share-ready formatting.** Add one-click copy text:
   `"I'm <NBA/WNBA name> in our run. Fit 0.73. #MulberryHoops"`; this
   increases replay and group banter.

## Recommended execution order (updated)

1. Implement stability system (hysteresis + stickiness + stale-age guardrail).
2. Rename user-facing copy to "Pro Basketball" and include WNBA entries.
3. Refresh pool to ~60 with 4:1 famous:infamous mix.
4. Add explainability row (top-3 matching dimensions).
5. Revisit fit color thresholds using observed live distribution.

## Cheatsheet for next session

If you're picking this up cold, do these in order:

1. Read `src/features/dashboards/basketball/nbaComparisons.ts` end to end.
2. Skim `src/features/dashboards/basketball/compute.test.ts` to see
   what's covered.
3. Apply the user-facing rename to "Pro Basketball" copy in dashboard text.
4. Implement the stability system (hysteresis + stickiness + stale-age guardrail) — it's
   smaller and doesn't depend on the pool work.
5. Refresh the pool to ~60 entries per the requirements above.
6. Add tests: a) stickiness keeps the same match when distance change is
   small; b) hysteresis re-runs the match when the friend vector moves
   past τ; c) a missing/corrupt anchor store falls back to full greedy.
