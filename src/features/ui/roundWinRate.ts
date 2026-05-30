export type RoundWinStats = {
  roundsWon: number;
  roundsLost: number;
  total: number;
  pct: number | null;
};

export function roundWinStats(roundsWon: number, roundsLost: number): RoundWinStats {
  const total = roundsWon + roundsLost;
  const pct = total > 0 ? Math.round((roundsWon / total) * 100) : null;
  return { roundsWon, roundsLost, total, pct };
}

export function winRateBarClass(pct: number): string {
  if (pct > 50) return "win-rate-fill-above";
  if (pct < 50) return "win-rate-fill-below";
  return "win-rate-fill-even";
}

export function winRateAriaLabel(stats: RoundWinStats): string {
  if (stats.pct === null || stats.total === 0) {
    return "No decided rounds";
  }
  return `${stats.pct}% round win rate, ${stats.roundsWon} wins and ${stats.roundsLost} losses in ${stats.total} decided rounds`;
}
