export function scoreClassForSignedValue(value: number): string {
  if (value > 0) return "score-positive";
  if (value < 0) return "score-negative";
  return "score-neutral";
}

export function rankCellClass(rank: number | undefined | null): string {
  if (rank === 1) return "td-rank numeric rank-1";
  if (rank === 2) return "td-rank numeric rank-2";
  if (rank === 3) return "td-rank numeric rank-3";
  return "td-rank numeric";
}

export function fitScorePercent(fitScore: number): number {
  return Math.max(0, Math.min(100, Math.round(fitScore * 100)));
}

export function fitScoreClass(fitScore: number): string {
  if (fitScore > 0.66) return "score-positive";
  if (fitScore < 0.45) return "score-negative";
  return "score-neutral";
}
