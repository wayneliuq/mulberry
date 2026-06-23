# FTL Dashboard — Execution Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Fight the Landlord dashboard with 5 stat tables, toggled from the existing Dashboards page.

**Architecture:** Mirrors the basketball dashboard pattern — `features/dashboards/ftl/` directory with compute/types/constants, API fetcher in `lib/api/read.ts`, toggle in `DashboardsPage.tsx`.

**Tech Stack:** React, TanStack Query, Supabase PostgREST, existing design tokens.

---

## Deliverable 1: Types and Constants

**Files:**
- Create: `src/features/dashboards/ftl/types.ts`
- Create: `src/features/dashboards/ftl/constants.ts`

**types.ts:**
```typescript
export type FtlDashboardRound = {
  roundId: string;
  gameId: string;
  createdAt: string;
  landlordSideSelections: number[];
  numBombs: number;
  gameMultiplier: number;
  outcome: "won" | "lost";
};

export type FtlDashboardRoundEntry = {
  roundId: string;
  playerId: number;
  pointDelta: number;
};

export type FtlDashboardData = {
  players: Array<{ id: number; displayName: string; familyId: string | null }>;
  rounds: FtlDashboardRound[];
  roundEntries: FtlDashboardRoundEntry[];
};

export type FtlStatRow = {
  label: string;
  value: number;
  valueLabel: string;
  details: string;
};

export type FtlDashboardSection = {
  id: string;
  title: string;
  explanation: string;
  rows: FtlStatRow[];
};

export type FtlDashboardSplitSection = {
  id: string;
  title: string;
  explanation: string;
  positiveTitle: string;
  negativeTitle: string;
  positiveRows: FtlStatRow[];
  negativeRows: FtlStatRow[];
};

export type FtlDashboardModel = {
  sections: FtlDashboardSection[];
  splitSections: FtlDashboardSplitSection[];
  diagnostics: { totalRounds: number; eligiblePlayers: number };
};
```

**constants.ts:**
```typescript
export const FTL_MIN_ROUNDS = 10;
export const FTL_MIN_COMBO_ROUNDS = 3;
export const FTL_TOP_POTS_COUNT = 5;
export const FTL_TOP_STREAKS_COUNT = 5;
export const FTL_TOP_COMBOS_COUNT = 5;
```

---

## Deliverable 2: API Fetcher

**Files:**
- Modify: `src/lib/api/read.ts` (append)
- Modify: `src/lib/api/types.ts` (append FtlDashboardData type)

Add `fetchFtlDashboardData()`:
- Query `rounds` where `game_type_id = 'fight-the-landlord'`
- Filter to rounds where `settings_snapshot->'metadata'->>'landlordSideSelections'` is not null
- Join `round_entries` for point deltas
- Join `players` for display names
- Return `FtlDashboardData`

---

## Deliverable 3: Compute Logic

**Files:**
- Create: `src/features/dashboards/ftl/compute.ts`
- Create: `src/features/dashboards/ftl/compute.test.ts`

**compute.ts** exports `buildFtlDashboardMetrics(data: FtlDashboardData): FtlDashboardModel`

Sections to compute:

1. **Landlord Win Rate** — overall: count rounds where outcome="won" / total. Per player: for each player in landlordSideSelections, count wins / total appearances. Filter to 10+ rounds played.

2. **Landlord Frequency** — count per player how many times they appear in any landlordSideSelections array. Selections per round = total selections / rounds played.

3. **Alliance Win Rate** — for each round, generate all 2-element subsets of landlordSideSelections. Track per-subset win count and total. Filter to 3+ rounds together. Top 5 and bottom 5.

4. **Biggest Pots** — sort rounds by `abs(sum of all point_deltas for that round)` descending (should be 0 for zero-sum, so use max absolute individual delta or total landlord-side gain). Actually: sort by `max(abs(point_delta))` per round, or by `pointBasis * gameMultiplier * (numBombs + 1) * landlordSideSelections.length` as the pot size. Top 5.

5. **Win Streaks** — for each player, track consecutive landlord-side wins. Find longest streak. Top 5 players.

---

## Deliverable 4: Dashboard Page Toggle

**Files:**
- Modify: `src/routes/DashboardsPage.tsx`

Changes:
- Add state: `activeGameType: "basketball" | "fight-the-landlord"` (default basketball)
- Add toggle UI at top of page (same tab pattern as LeaderboardsPage game filters)
- Conditionally render basketball dashboard or FTL dashboard based on toggle
- Basketball section unchanged — just wrapped in conditional

---

## Deliverable 5: FTL Dashboard Rendering

**Files:**
- Modify: `src/routes/DashboardsPage.tsx` (add FTL section)

Render FTL sections using existing `RankedTable` and `SectionHeader` components. Layout mirrors basketball: sections in order (Landlord Win Rate, Landlord Frequency, Alliance Win Rate, Biggest Pots, Streaks). Split sections (Alliance Win Rate) use positive/negative pattern.

---

## Deliverable 6: Tests

**Files:**
- Create: `src/features/dashboards/ftl/compute.test.ts`

Test each compute function:
- Landlord win rate with mock round data
- Alliance combo extraction and filtering
- Biggest pots sorting
- Streak calculation
- Player threshold filtering (10+ rounds)

---

## Verification

### Autonomous Visual Validation (per deliverable)
After building each component, start the dev server and validate visually:
1. `npm run dev` — start dev server
2. Navigate to the relevant page in the browser
3. Take a screenshot via `browser_vision` to verify rendering
4. **Data cross-check**: query Supabase directly via CLI for the same stat, compare expected vs actual output shown in the dashboard UI
5. Spot-check math: pick 2-3 specific players/combos and manually verify their computed values match the raw DB data

### Final Validation
1. `npm run build` — no type errors
2. `npm run test` — all tests pass
3. Manual: toggle to FTL on dashboards page, verify 5 sections render with real data
4. Manual: verify 10+ round filter excludes casual players
5. Manual: verify alliance combos show meaningful pairs (not random noise)
6. **Math audit**: for each section, query raw DB data and compare 3+ rows against dashboard output

## Risks

- **Data sparsity:** Only 132 structured rounds. With 10+ round threshold, may have few eligible players. Mitigation: show "Not enough data" gracefully.
- **Combo explosion:** 2-player subsets from 3-12 player rounds = many combos. Most will have <3 rounds. Filter to min 3 rounds.
- **Zero-sum pot size:** Since point deltas sum to 0, "biggest pot" should use max absolute individual delta or computed pot size formula.
