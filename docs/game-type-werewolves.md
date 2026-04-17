## Werewolves – Points & Rounds

This document explains **how points are calculated** for the `Werewolves` game type.

The scoring model has two layers:

1. **Team outcome** (winning vs. losing teams).
2. **Survival bonus** (alive vs. dead players at the end).

Each round is kept **zero-sum** (within a small rounding tolerance) and is fully reproducible from stored inputs.

---

## Roles and inputs

Each round requires:

- **Active players**
  - `activePlayerIds`: all players participating in the round.
  - Must contain **at least 3** distinct players.
- **Team assignments**
  - For each active player:
    - `playerId`
    - `team ∈ {"werewolf", "villager", "neutral"}`
  - `playerAssignments` must include at least **3** assigned players and should cover all `activePlayerIds`.
- **Survival status**
  - `survivedPlayerIds`: players who are **alive at the end** of the game.
- **Winning teams**
  - `winningTeamIds`: one or more teams from `{"werewolf", "villager", "neutral"}`.
  - Must contain at least **one** team.
- **Scoring parameter**
  - `pointBasis` (integer > 0): base unit that controls round magnitude.

From these, the engine derives:

- `winnerIds`: active players whose team is in `winningTeamIds`.
- `loserIds`: active players whose team is **not** in `winningTeamIds`.

The round is only valid if there is **at least one winner and one loser**.

---

## Step 1 – Base pool

Let:

- `T` = number of active players (`activePlayerIds.length`).

The **pool** for the round is:


\text{pool} = T \times \text{pointBasis}


This pool drives the amount transferred from losers to winners.

---

## Step 2 – Team outcome transfer

Let:

- `W` = number of winners (`winnerIds.length`).
- `L` = number of losers (`loserIds.length`).

The total value that transfers based on team outcome is:


\text{totalTransfer} = \text{pool}


From this, the **per-player base amounts** are:

- For each winner:
  \[
  \text{baseWinner} = \frac{\text{totalTransfer}}{W}
  \]
- For each loser:
  \[
  \text{baseLoser} = \frac{\text{totalTransfer}}{L}
  \]

These amounts are then **rounded to 1 decimal place**, and applied as:

- Winner `p` gets:
  - `+roundTo1Decimal(baseWinner)`
- Loser `p` gets:
  - `-roundTo1Decimal(baseLoser)`

All other players (if any unassigned to winner/loser due to missing assignment) default to `0` at this stage.

---

## Step 3 – Survival bonus and death penalty

Let:

- `aliveCount` = number of active players whose ID is in `survivedPlayerIds`.
- `deadCount = T - aliveCount`.

If both `aliveCount > 0` and `deadCount > 0`, a survival layer is applied:

- Define a **survival pool** based on the scoring parameter:
  - `totalAliveBonus = pointBasis`.
- The per-survivor bonus is:
  \[
  \text{bonusPerAlive} = \frac{\text{totalAliveBonus}}{\text{aliveCount}}
  \]
- This is funded entirely by the dead players:
  - `deductionPerDead = totalAliveBonus / deadCount`

Then for each active player:

- If the player **survived**:
  - Their point delta is increased by `+bonusPerAlive` (rounded to 1 decimal).
- If the player **died**:
  - Their point delta is decreased by `-deductionPerDead` (rounded to 1 decimal).

This keeps the survival modifier zero-sum within rounding limits.

---

## Step 4 – Zero-sum correction

After:

1. Applying team-based amounts, and
2. Applying survival bonuses/penalties,

we have a provisional set of entries:

- For each `playerId` in `activePlayerIds`:
  - `pointDelta(playerId)` (possibly 0).

The engine then:

- Computes the total:
  \[
  \text{total} = \sum\_{\text{players}} \text{pointDelta}
  \]
- If `|total| > 0.01` and there is at least one entry:
  - Adjusts the **first** player in `activePlayerIds` by subtracting this residual:
    - New value is re-rounded to **1 decimal place**.
  - Recomputes the total, which should now be within the tolerance window.

The result is flagged as **zero-sum** if:

- `Math.abs(total) < 0.01`

---

## Interpretation & behavior

- **Team success**:
  - Winning teams collectively draw points from losing teams, scaled by:
    - Number of players (`T`),
    - `pointBasis`.
- **Survival**:
  - Surviving players share a fixed pool of `pointBasis` points (each gets `pointBasis / aliveCount`).
  - Dead players collectively pay for this bonus, split evenly across all dead players.
- **Rounding**:
  - All intermediate player deltas are stored with **one decimal place**.
  - A small correction on the first player keeps the round effectively zero-sum.

This design ensures that:

- Team outcome matters **a lot** (via `pointBasis` and pool size).
- Survival always matters **a little** (via the fixed `pointBasis` survival pool).
- Every round’s calculations are deterministic and reconstructable from its stored inputs.