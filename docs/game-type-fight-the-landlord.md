## Fight the Landlord (SE) – Points & Rounds

This document explains **how points are calculated** for the `Fight the Landlord (SE)` game type.

The rules are designed to be:

- **Zero-sum** across all players in each round (within small rounding tolerance).
- **Symmetric** between winning and losing sides.
- **Configurable** via point basis, bombs, and a per-selection multiplier.

---

## Roles and inputs

Each round requires:

- **Active players**:
  - `activePlayerIds`: all participating players in the round.
  - Must contain **at least 3** distinct players.
- **Landlord side**:
  - Must contain **at least 1 selection**.
  - Each **unlocked** participating player can be selected **zero or more times** into the landlord side.
  - Each selection is an independent entry in `landlordSideSelections`, e.g.:
    - `landlordSideSelections = [PlayerA, PlayerA, PlayerB, ...]`
  - For each time a player is selected, that player receives **one unit of `landlordPoints`**:
    - If Player A is selected once, they get `1 × landlordPoints`.
    - If Player B is selected three times, they get `3 × landlordPoints`.
  - For the purposes of determining the **opposing side**, any player that appears **at least once** in `landlordSideSelections` is considered part of the landlord side (regardless of how many times they appear).
- **Opposing side**:
  - All active players **who do not appear at all** in `landlordSideSelections`.
  - There must be **at least one opposing player**; otherwise the round is invalid.
- **Outcome**:
  - `outcome = "won"` if the **landlord side** won the round.
  - `outcome = "lost"` if the **landlord side** lost.
- **Scoring parameters**:
  - `pointBasis` (integer > 0): base unit for the game.
  - `numBombs` (integer ≥ 0): number of bombs in the round.
  - `gameMultiplier` (integer ≥ 1): overall multiplier applied to the round.

---

## Core formulas

### Base points

From the game settings and round details:

- Define:

\text{landlordPoints} = \text{pointBasis} \times \text{gameMultiplier} \times (\text{numBombs} + 1)

- Sign convention:
  - If `outcome = "won"`, `landlordPoints` is treated as **positive** (gains for landlord-side players).
  - If `outcome = "lost"`, `landlordPoints` is treated as **negative** (losses for landlord-side players).

These are the **raw per-selection amounts** applied to landlord-side players.

### Total landlord-side stake

Let:

- `S` = total number of selections in the landlord side  
(i.e. `S = landlordSideSelections.length`).

Total points at stake for the landlord side, if they win or lose, is:

\text{totalLandlordSidePoints} = \text{landlordPoints} \times S

This quantity is what ultimately transfers between the landlord side and the opposing side (including sign).

---

## Case 1 – Landlord side WINS

When `outcome === "won"`:

- **Winners**: all players who appear at least once in `landlordSideSelections`.
- **Losers**: all players in the opposing side.

#### Winner entries

For each landlord-side player `p`:

- Let `count(p)` be the number of times `p` appears in `landlordSideSelections`.
- Player `p` receives:

\text{pointDelta}(p) = \text{landlordPoints} \times \text{count}(p)

Total winner points:

\text{totalWinnerPoints}
  = \text{landlordPoints} \times S

#### Loser entries

The **opposing side** shares the loss **evenly**:

- Let `L` = number of opposing players.
- Each opposing player `q` gets:

\text{pointDelta}(q) = -\frac{\text{totalWinnerPoints}}{L}

All point deltas are stored as decimals (up to 2 decimal places in practice).

---

## Case 2 – Landlord side LOSES

When `outcome === "lost"`:

- **Winners**: all players in the opposing side.
- **Losers**: all players who appear at least once in `landlordSideSelections`.

#### Loser entries (landlord side)

For each landlord-side player `p`:

- Let `count(p)` be the number of times `p` appears in `landlordSideSelections`.
- Since `landlordPoints` is negative in this case, player `p` receives:

\text{pointDelta}(p) = \text{landlordPoints} \times \text{count}(p)

The sum of all landlord-side deltas is:

\text{totalLandlordSidePoints} = \text{landlordPoints} \times S

This value will be **negative**, representing the total amount they collectively lose.

#### Winner entries (opposing side)

The **entire** landlord-side loss in absolute value is paid out evenly to winners:

- Let `W` = number of opposing players.
- Each opposing player `q` gets:

\text{pointDelta}(q) = +\frac{|\text{totalLandlordSidePoints}|}{W}

Again, values are stored as decimals with up to two decimal places.

---

## Zero-sum and ordering

After all entries are computed:

- Entries are **sorted** to follow the order of `activePlayerIds`.
- The round total is:

\text{total} = \sum{\text{entries}} \text{pointDelta}

- The implementation treats the round as **zero-sum** if:
  - `Math.abs(total) < 0.01`

This allows for minor floating-point rounding differences while still enforcing the zero-sum property.

---

## Intuition & behavior

- **Bombs** (`numBombs`) and the **game multiplier** (`gameMultiplier`) scale how big the round is.
- **Selection count** replaces a separate landlord multiplier:
  - A player selected multiple times into the landlord side takes on **more risk and reward**.
- When the landlord side wins:
  - Each landlord-side player gains `landlordPoints` per selection.
  - The opposing side shares the total loss equally.
- When the landlord side loses:
  - Each landlord-side player loses `|landlordPoints|` per selection.
  - The opposing side shares the total gain equally.

This structure keeps every round **fair, symmetric, and zero-sum**, while making a player’s exposure proportional to how many times they are selected into the landlord side.