## Texas Hold'em – Points & Rounds

This document explains **how points are entered and interpreted** for the `Texas Hold'em` game type.

The goal is to make point entry predictable, auditable, and consistent with Mulberry's zero-sum principles.

---

## Round structure

- **Participants**: All *unlocked* players in the game at the time of the round.
- **Per-player input**: For each participant, the admin enters a **point delta** for the round:
  - A **positive** value means the player *won* points.
  - A **negative** value means the player *lost* points.
  - `0` means the round was *neutral* for that player.
- **Decimals**:
  - The UI allows up to **two decimal places** for point deltas.
  - Internally, values are stored and used as JavaScript numbers and treated as decimal scores, not money.

---

## How points are calculated

### Per-player round result

For Texas Hold'em, the **entered value is the final value**:

- Let `delta(p)` be the point delta entered for player `p`.
- The round entry stores:
  - `playerId = p`
  - `pointDelta = delta(p)`

There is **no additional computation** or redistribution layer beyond what is entered.

### Round total and zero-sum behavior

- The round total is:

\text{roundTotal} = \sum{\text{players } p} \text{delta}(p)

- The game engine reports:
  - `total = roundTotal`
  - `isZeroSum = (roundTotal === 0)`

#### UI safety check

Because this game type is often expected to be **zero-sum**:

- When saving a round, the UI:
  - Computes the total across all players.
  - Rounds the total to **two decimals**.
  - If `|roundedTotal| > 0.01`, a confirmation dialog is shown:
    - The admin can still choose to continue and save the round.

This prevents accidental mis-entries but still allows **non-zero-sum rounds** when desired.

---

## Interpreting results over time

- **Per-round**:
  - A player’s round is a *win* if `pointDelta > 0`.
  - A player’s round is a *loss* if `pointDelta < 0`.
  - `0` is neutral.
- **Across the game**:
  - The game total for a player is the **sum of all round deltas** for that player.
  - Game win/loss interpretations follow the global Mulberry rules (final total > 0 is a win, < 0 is a loss).

---

## When to use this game type

Texas Hold'em is appropriate when:

- You already know the **exact per-player win/loss amounts** for each round (e.g. from stacks, chips, or external calculations).
- You want the scoring system to **record**, not **derive**, point transfers.

If you want automatic redistribution logic (e.g. landlord vs. peasants, or team- and survival-based scoring), use a more specialized game type such as **Fight the Landlord (SE)** or **Werewolves**.