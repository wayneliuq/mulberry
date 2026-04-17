## Dixit – Points & Rounds

This document explains **how points are entered and calculated** for the `Dixit` game type.

You enter **raw** scores per player; Mulberry derives **stored** round deltas that are **zero-sum** (after rounding) and optionally scaled by how spread out the raw scores were. Each round remains reproducible from stored round data (including metadata).

---

## Round structure

- **Participants**: All *unlocked* players in the game at the time of the round (same rule as other types; see `docs/rules.md` for locked players).
- **Minimum players**: At least **two** unlocked players.
- **Per-player input**: For each participant, the admin enters a **raw score** (any finite number the UI accepts).
  - Values are interpreted as **relative round performance**, not money.
  - The UI allows up to **two decimal places**; each raw value is **rounded half away from zero to two decimals** before any further step.
- **Join order**: Each entry carries the player’s `**joinOrder`** (ascending order in which they joined the game). It is used only for **tie-breaking residual corrections** after rounding (see below).

There is **no** per-round point basis or other game-type-specific settings beyond what already exists on the game record (see **Game settings**).

---

## Game settings

- The database still stores `**point_basis`** for every game; for Dixit it is **fixed to `1`** and **not used** in the Dixit formulas.
- The create-game and game-settings UIs **hide** point basis for Dixit; the backend also forces `point_basis = 1` on create and update for Dixit games.

---

## How points are calculated

Work in **join order**: sort entries by ascending `joinOrder`. Let n be the number of participants (n \ge 2).

### Step 1 – Clamp raw scores

For each player p, let r_p be the entered raw score. Define the clamped raw score:

\hat{r}_p = \mathrm{round2}(r_p)

where `round2` means rounding to **two decimal places**, consistent with other point deltas in Mulberry (`docs/rules.md`).

Let:

S = \sum_p \hat{r}_p

### Step 2 – Correction factor from raw spread

Let:

\Delta_{\text{raw}} = \max_p(\hat{r}_p) - \min_p(\hat{r}_p)

The **correction factor** is:

k = \frac{\Delta_{\text{raw}}}{10}

If all clamped raw scores are equal, then \Delta_{\text{raw}} = 0 and k = 0. The stored round will be **all zeros** after the pipeline (the mean-adjusted vector is already zero).

### Step 3 – Mean removal (first zero-sum vector)

Let \bar{r} = S / n. For each player in join order, the **exact** mean-centered value is:

x_p = \hat{r}_p - \bar{r}

Round each to two decimals:

x'_p = \mathrm{round2}(x_p)

The values x'_p usually do **not** sum to exactly zero because of rounding. Let T_1 = \sum_p x'_p. A **first residual** \varepsilon_1 = \mathrm{round2}(-T_1) is applied entirely to the player with the **smallest `joinOrder`** among participants (the first row after sorting). That player’s value becomes \mathrm{round2}(x'_p + \varepsilon_1) and everyone else keeps x'_p. Call the resulting per-player amounts **a_p**. They satisfy \sum_p a_p = 0 within floating tolerance used in code.

### Step 4 – Scale and final rounding (second residual)

Multiply the mean-centered vector by the correction factor, then round again:

s_p = \mathrm{round2}(a_p \cdot k)

Again \sum_p s_p may not be exactly zero. Let T_2 = \sum_p s_p. A **second residual** \varepsilon_2 = \mathrm{round2}(-T_2) is applied to the **same** player as in step 3 (smallest `joinOrder`). The **stored** `pointDelta` for the round is that final two-decimal value per player.

The round total is \sum_p \text{storedDelta}(p); it is **zero** within the engine’s tolerance.

---

## What gets stored

- `**round_entries`**: One row per unlocked player with the **final** `pointDelta` from step 4 (not the raw \hat{r}_p).
- **Round metadata** (for audit / replay): includes the **raw** clamped triples (\text{playerId}, \text{pointDelta}, \text{joinOrder}) and a `mode` marker for Dixit.
- **Round summary text** (human-readable list): Uses **display names** and the **stored** (adjusted) deltas, ordered by join order.

---

## Interpreting results over time

Interpretation matches global Mulberry rules (`docs/rules.md`):

- **Per round**: `pointDelta > 0` is a round win, `< 0` a round loss, `0` neutral.
- **Per game**: Totals are the sum of stored round deltas; final sign determines game win/loss.

---

## When to use this game type

Dixit fits when you want to:

- Capture **free-form numeric scores** per round without enforcing that raw entries sum to zero.
- Have Mulberry **center** scores (remove the average) and **optionally shrink** them when the raw spread is small (k scales with raw range).

If you need **exactly what was typed** with no derivation, use **Texas Hold'em** instead. For structured team or role rules, use **Werewolves** or **Fight the Landlord (SE)**.