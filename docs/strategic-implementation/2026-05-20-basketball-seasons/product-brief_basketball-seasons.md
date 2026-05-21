# Product Brief: Basketball Seasons
_Slug: basketball-seasons · Date: 2026-05-20 · Autonomy: auto_

## 1. Working backwards (≤5 sentences, release-note voice)
Basketball now runs in named six-month seasons, so standings, skills, scores, and rankings are clearly scoped to the active season while older seasons remain intact for review. Existing basketball history appears under Season 1, and the basketball view shows when the next season begins. At each season boundary, a new season opens automatically, with a manual override available for controlled rollover. Player identity stays consistent across seasons, but only players with activity in a season appear in that season's leaderboard and dashboard views. Historical seasons remain available from inside basketball without exposing season switching in other game views.

## 2. What the user does / sees

**Who is the user of this feature:** Mulberry basketball players and basketball admins using basketball rounds, leaderboards, and dashboard views.

### D1 — Basketball rounds, leaderboards, and dashboards show a subtle top message with next-season timing.
**How a user verifies:**
1. Open basketball rounds, leaderboard, and dashboard views and confirm each shows a subtle, readable top-of-view season notice.
2. Confirm the notice includes next season date plus countdown wording (for example, "New season starts on June 21, 2026 - 30 days away").
3. Check that this notice appears only in basketball views and is not shown in other game-type views.

### D2 — Basketball history is organized by season, and users can view prior seasons from basketball.
**How a user verifies:**
1. Open basketball leaderboard or dashboard history controls.
2. Select a prior season and confirm the displayed standings/statistics match that season's period.
3. Return to the current season and confirm current-season data is restored.

### D3 — New seasons start on schedule with manual override support, while preserving identity and empty-start behavior.
**How a user verifies:**
1. At a season boundary, confirm basketball opens into a new season without changing historical season views.
2. Confirm an admin can manually trigger season rollover when needed.
3. In a newly started season, confirm players with no new-season activity do not appear in leaderboards/dashboards until they have data.

### D4 — Historical seasons remain stable even when later seasons evolve.
**How a user verifies:**
1. Open a prior basketball season and note key leaderboard/dashboard values.
2. After progressing into a later season, reopen the prior season.
3. Confirm the earlier season's displayed values and season-specific behavior remain unchanged.

## 3. Success signal
From a user perspective, basketball users consistently see season-scoped dashboards/leaderboards with correct rollover timing, can switch to prior basketball seasons, and never observe cross-season stat bleed between seasons.

## 4. Boundaries
**In scope:**
- Season model for all basketball dashboards, skills, scores, and rankings.
- Basketball-only top-of-view notice that shows next season start date and days-away countdown.
- Automatic season rollover on fixed solstice schedule plus manual override path.
- Assignment of existing basketball data into Season 1.
- Season-aware browsing of historical basketball data from basketball views only.

**Out of scope:**
- Season support for non-basketball game types.
- Redesign of non-basketball navigation.
- New user-facing analytics unrelated to seasoning behavior.

**Anti-goals (philosophy-level — we deliberately will not):**
- We will not allow season controls to leak into non-basketball views.
- We will not retroactively rewrite prior season outcomes when future seasons change.
- We will not force inactive players into current-season leaderboards.

## 5. Decisions
| Decision | Choice | Status |
|---|---|---|
| Season cadence and boundaries | Fixed two-season annual cycle: Jun 21-Dec 20 and Dec 21-Jun 20 | `[HARD DECISION]` |
| Season transition control | Automatic rollover at boundary dates with manual admin override | `[HARD DECISION]` |
| Existing historical data placement | All current basketball data is treated as Season 1 | `[HARD DECISION]` |
| Player model across seasons | Keep one player identity across seasons; show players per-season only when active in that season | `[HARD DECISION]` |
| Season visibility scope | Season selection and history access remain inside basketball views only | `[HARD DECISION]` |
| Next-season notice behavior | Basketball rounds, leaderboards, and dashboards include subtle top notice with next-season date and days-away countdown | `[HARD DECISION]` |
| Historical season stability | Later-season tracking changes must not alter prior season user-visible results | settled |

## 6. Risks & unknowns
- Manual override governance: confirm exactly who can trigger rollover and what audit visibility is required.
- Season boundary edge timing: confirm expected behavior for games entered near midnight boundary transitions.
- User comprehension risk: season switch controls and countdown copy may need lightweight wording validation for clarity.
- Historical trust risk: any perceived cross-season data bleed will reduce confidence; this needs explicit validation during rollout.

## 7. References & revision log
**Document references:**
- Architecture: `docs/game-type-basketball.md`
- UX/PMF: `docs/nba-comp-design.md`
- Security policy: none
- Schema/ERD: none

**Revision log:**
- v0.1 · 2026-05-20 · initial draft
- v0.2 · 2026-05-20 · added required basketball-only top notice with explicit date and days-away countdown across rounds, leaderboards, and dashboards
