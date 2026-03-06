# Mulberry Rules Decisions

This document resolves the open questions called out in `docs/implementation-roadmap.md` so implementation can proceed without revisiting core behavior mid-build.

## General principles

- History is the source of truth.
- All calculations must be reproducible from stored source records.
- Player-, round-, and settlement-related records should prefer stable IDs over copied display text.
- Public users can read allowed data, but only admin-authenticated actions can create, edit, or delete data.

## Families

- A family is a named group stored as a first-class record.
- A player may belong to zero or one family at a time.
- Family membership is used for:
  - family leaderboards
  - settlement grouping during `calculate $`
- Family membership does not merge players for round entry, point totals, or game history.
- A family can exist with one member temporarily, but family leaderboard views should only show families with at least two active members.

## Wins and losses

### Round wins and losses

- A player records a round win when their point delta for that round is greater than `0`.
- A player records a round loss when their point delta for that round is less than `0`.
- A point delta of `0` is neutral and does not count as a win or loss.

### Game wins and losses

- Game win/loss values are determined from the final game point total when the game ends or is otherwise considered complete.
- A player records a game win when their final game total is greater than `0`.
- A player records a game loss when their final game total is less than `0`.
- A final total of `0` is neutral and does not count as a win or loss.
- Tied positive totals are all wins, and tied negative totals are all losses.

## Locked players

- A locked player is temporarily inactive for new rounds.
- Locked players remain visible in the game and keep their accumulated totals.
- Locked players must be excluded from:
  - round-entry forms
  - game-type calculations for new rounds
  - zero-sum balancing for new rounds
- Unlocking a player allows them to participate in subsequent rounds only.
- Locking or unlocking a player must never retroactively change historical rounds.

## Removing players from a game

- A player can be removed from a game only if they have no round entries and are not part of a stored settlement for that game.
- If a player has already participated historically, removal is blocked.
- Historical participants can be locked instead of removed.

## Renaming players

- Player records store one canonical current display name.
- Historical views should render the current player name by resolving the player ID, not by freezing old text copies.
- Player rename events must be recorded in the audit log.
- Round and settlement source records should not duplicate player names except for optional human-readable snapshots that are explicitly non-authoritative.

## Money representation and rounding

- Money must be stored in integer cents, not floating-point dollars.
- UI displays dollars, but all calculations and persistence use cents.
- The initial game settings UI uses 5-cent increments for `money_per_point`, so current v1 calculations should always resolve exactly to whole cents.
- If a future rule introduces a fractional-cent intermediate result, round half away from zero to the nearest cent before persistence.
- Settlement transfer totals must always sum exactly to zero across the game.

## Settlement grouping

- Family grouping applies only while computing the transfer graph for a confirmed settlement.
- The stored per-player money impact still belongs to individual players so player money leaderboards remain accurate.
- The transfer list may reference a family group label when multiple related players settle as one unit, but the underlying settlement must remain traceable back to the individual members included in that grouped calculation.

## Fight the Landlord distribution

- Fight the Landlord must remain zero-sum for every round.
- Use the roadmap formula as the base rule:
  - landlord points = `point_basis * bomb_multiplier * landlord_multiplier`
  - each landlord friend points = `point_basis * bomb_multiplier`
- When the winning side gains points, the losing side shares the total loss as evenly as possible.
- When the losing side loses points, the winning side shares the total gain as evenly as possible.
- If an equal split would leave a remainder, distribute the extra `1` point at a time using the affected players' game join order, starting from the earliest joined active player.
- Join order must therefore be stored for each player within a game.

## Game settings changes

- Game settings updates only apply to future rounds and future settlements.
- Each round and settlement must store the settings snapshot needed to reproduce that historical calculation.

## Deletions and undo

- Deleting a round removes that round's effect from game totals and leaderboards after recalculation.
- Deleting a game removes all of its historical effect from derived summaries and leaderboards.
- Deleting a confirmed settlement must:
  - remove its leaderboard impact
  - unlock the game
  - preserve prior rounds
- Destructive actions require admin confirmation and audit-log entries.

## Unicode

- Player names, game names, and family names must support full Unicode input and display.
