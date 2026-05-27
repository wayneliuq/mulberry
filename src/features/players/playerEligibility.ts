import {
  balanceManualPointEntries,
  type ManualPointEntry,
} from "../game-types/manualPointBalance";

/** Player is hidden from leaderboards and must receive zero point deltas. */
export function isScoreNeutralHidden(
  player: { isScoreNeutralHidden?: boolean },
): boolean {
  return Boolean(player.isScoreNeutralHidden);
}

/** Player may appear on leaderboards and family aggregates. */
export function isLeaderboardEligible(
  player: { isScoreNeutralHidden?: boolean },
): boolean {
  return !isScoreNeutralHidden(player);
}

export function isNearZeroPointDelta(value: number, epsilon = 0.01): boolean {
  return Math.abs(value) <= epsilon;
}

export function mergeCalculatedEntriesWithGhostZeros(
  calculated: Array<{ playerId: number; pointDelta: number }>,
  allPlayerIds: number[],
  ghostPlayerIds: Set<number>,
): Array<{ playerId: number; pointDelta: number }> {
  const byId = new Map(
    calculated.map((entry) => [entry.playerId, entry.pointDelta]),
  );

  return allPlayerIds.map((playerId) => ({
    playerId,
    pointDelta: ghostPlayerIds.has(playerId) ? 0 : (byId.get(playerId) ?? 0),
  }));
}

export function balanceManualEntriesExcludingGhosts(
  entries: ManualPointEntry[],
  ghostPlayerIds: Set<number>,
) {
  const scoringEntries = entries.filter(
    (entry) => !ghostPlayerIds.has(entry.playerId),
  );
  const ghostEntries: ManualPointEntry[] = entries
    .filter((entry) => ghostPlayerIds.has(entry.playerId))
    .map((entry) => ({ playerId: entry.playerId, pointDelta: 0 }));

  if (scoringEntries.length === 0) {
    return {
      ok: true as const,
      entries: ghostEntries,
      total: 0,
      isZeroSum: true,
    };
  }

  const balance = balanceManualPointEntries(scoringEntries);
  if (!balance.ok) {
    return balance;
  }

  return {
    ok: true as const,
    entries: [...balance.entries, ...ghostEntries],
    total: balance.total,
    isZeroSum: balance.isZeroSum,
  };
}
