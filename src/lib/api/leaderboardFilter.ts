/**
 * Minimum rounds (won + lost) for a player to appear in the basketball
 * player leaderboard when viewing the active or any future season.
 * Historical (closed) seasons are unaffected by this filter.
 *
 * Distinct from `PLAYER_MIN_ROUNDS` in `features/dashboards/basketball/constants.ts`,
 * which is a statistical-significance gate for the basketball dashboard metrics.
 */
export const LEADERBOARD_MIN_ROUNDS = 10;

/**
 * Drop player rows that have not exceeded the leaderboard min-rounds threshold.
 * A player is kept when `roundsWon + roundsLost > LEADERBOARD_MIN_ROUNDS`.
 */
export function applyLeaderboardMinRoundsFilter<
  T extends { roundsWon: number; roundsLost: number },
>(players: T[]): T[] {
  return players.filter(
    (player) => player.roundsWon + player.roundsLost > LEADERBOARD_MIN_ROUNDS,
  );
}

/**
 * Aggregate per-player distinct round counts from a flat list of round entries.
 *
 * Mirrors the leaderboard's per-game-type "rounds played" semantic: each round a
 * player has any non-zero point-delta entry in counts as one. Duplicate
 * `(round_id, player_id)` rows (rare in practice, e.g. ghost rebalancing) count
 * once. Entries with `point_delta === 0` are skipped.
 */
export function aggregatePlayerRoundCounts(
  entries: Array<{ round_id: string; player_id: number; point_delta: number }>,
): Map<number, number> {
  const seen = new Set<string>();
  const counts = new Map<number, number>();
  for (const entry of entries) {
    if (entry.point_delta === 0) continue;
    const key = `${entry.round_id}:${entry.player_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.set(entry.player_id, (counts.get(entry.player_id) ?? 0) + 1);
  }
  return counts;
}
