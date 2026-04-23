## Basketball – Points & Rounds

This document explains **how points are calculated** for the **Basketball** game type (OpenSkill-backed rating).

Each Mulberry **round** is one pickup game to a target score (for example 11 with 1s and 2s, or 21 with 2s and 3s). Players can be on different teams in different rounds; each round can also bench players.

---

## Game settings

- **`point_basis`** is always **1** for basketball games (enforced on create, on settings update, and by migration). It is **not** used to scale OpenSkill into the ledger.
- **`money_per_point_cents`** still converts stored point totals to settlement money like other game types.

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

## Reproducibility

OpenSkill replay for round *n* depends only on prior rounds’ **teams + scores** (not on past Mulberry deltas).

Re‑deriving round *n*’s Mulberry deltas from history needs:

- Prior basketball metadata (teams + scores) in order,
- The same **`ledgerScale`** as stored for round *n* (pass `ledgerScale` into `calculateBasketballRound` when auditing).