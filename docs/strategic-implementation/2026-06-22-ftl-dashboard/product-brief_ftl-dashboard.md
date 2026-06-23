# Fight the Landlord Dashboard — Product Brief

## Goal

Add a 斗地主 (Fight the Landlord SE) dashboard to the existing Dashboards page, toggling between Basketball and FTL. Surfaces 5 stat tables from existing round data, filtered to players with 10+ rounds.

## Stats (ordered by section)

### 1. Landlord Side Win Rate
Single table: overall landlord-side win rate + per-player landlord-side win rate. Columns: Player, Win Rate, W/L, Rounds on Landlord Side. Overall row at top.

### 2. Landlord Frequency
Per-player: how often each player appears in `landlordSideSelections`. Columns: Player, Times Selected, Selections per Round, Rounds Played.

### 3. Alliance Win Rate (2-player combos)
From `landlordSideSelections`, extract all 2-player subsets per round. Track win rate per combo. Show top 5 and bottom 5 (min 3 rounds together). Columns: Combo, Win Rate, W/L, Rounds Together.

### 4. Biggest Pots
Top 5 rounds by absolute total point swing. Columns: Date, Players, Bombs, Multiplier, Winner Points, Loser Points.

### 5. Win Streaks
Top 5 players by longest consecutive win streak (landlord side wins). Columns: Player, Streak Length, Date Range.

## Data Source

- `rounds` table: `settings_snapshot->'metadata'` has `landlordSideSelections`, `numBombs`, `gameMultiplier`, `outcome`
- `round_entries` table: `point_delta` per player per round
- `game_players` table: player-game linkage
- Filter: `game_type_id = 'fight-the-landlord'`, only rounds with `landlordSideSelections` in metadata (132 of 192 rounds)
- Player threshold: 10+ rounds played

## UI

- `DashboardsPage.tsx`: add game type toggle (Basketball | Fight the Landlord) at top
- FTL dashboard reuses `RankedTable`, `MetricCard`, `SectionHeader` from `features/dashboards/components/`
- New directory: `src/features/dashboards/ftl/` with `compute.ts`, `types.ts`, `constants.ts`
- New API function: `fetchFtlDashboardData()` in `src/lib/api/read.ts`

## Scope

- No new dependencies
- No schema changes
- No new shared components (reuse existing)
- NBA comparison section NOT replicated (basketball-specific)

## Non-goals

- QuickFill rounds (27 rounds, no selection data) — excluded
- Historical trend charts — not in v1
- Per-game breakdown — dashboard-level aggregation only
