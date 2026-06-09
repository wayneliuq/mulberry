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
