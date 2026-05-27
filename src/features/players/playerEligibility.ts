import {
  balanceManualPointEntries,
  round2,
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

export type GhostRedistributionOptions = {
  /** When set, redistribute each ghost's former delta among non-ghost teammates on the same team. */
  teamByPlayerId?: Map<number, "A" | "B">;
};

/**
 * Force ghost players to 0 points and redistribute their deltas so the round stays zero-sum.
 * Required for basketball where ghosts are included in OpenSkill team size but must not keep ledger points.
 */
export function applyGhostPlayerZeroDeltas<
  T extends { playerId: number; pointDelta: number },
>(entries: T[], ghostPlayerIds: Set<number>, options?: GhostRedistributionOptions): T[] {
  if (ghostPlayerIds.size === 0) {
    return entries;
  }

  const ghostDrain = round2(
    entries
      .filter((entry) => ghostPlayerIds.has(entry.playerId))
      .reduce((sum, entry) => sum + entry.pointDelta, 0),
  );

  const result = entries.map((entry) => ({
    ...entry,
    pointDelta: ghostPlayerIds.has(entry.playerId) ? 0 : entry.pointDelta,
  }));

  if (Math.abs(ghostDrain) <= 0.01) {
    return result;
  }

  // Zeroing ghosts changes the round total by -ghostDrain; add ghostDrain back across scorers.
  const redistributeAmount = round2(ghostDrain);
  const scoringEntries = result.filter((entry) => !ghostPlayerIds.has(entry.playerId));
  if (scoringEntries.length === 0) {
    return result;
  }

  const teamByPlayerId = options?.teamByPlayerId;
  if (teamByPlayerId) {
    const groups = new Map<string, number[]>();
    for (const entry of scoringEntries) {
      const team = teamByPlayerId.get(entry.playerId);
      if (!team) {
        continue;
      }
      const existing = groups.get(team) ?? [];
      existing.push(entry.playerId);
      groups.set(team, existing);
    }

    const ghostByTeam = new Map<string, number>();
    for (const entry of entries) {
      if (!ghostPlayerIds.has(entry.playerId)) {
        continue;
      }
      const team = teamByPlayerId.get(entry.playerId);
      if (!team) {
        continue;
      }
      ghostByTeam.set(team, round2((ghostByTeam.get(team) ?? 0) + entry.pointDelta));
    }

    for (const [team, teamGhostDrain] of ghostByTeam) {
      const recipients = groups.get(team) ?? [];
      if (recipients.length === 0 || Math.abs(teamGhostDrain) <= 0.01) {
        continue;
      }
      distributeAmountAmong(result, recipients, round2(teamGhostDrain));
    }

    return fixZeroSumRounding(result, scoringEntries.map((e) => e.playerId));
  }

  distributeAmountAmong(
    result,
    scoringEntries.map((entry) => entry.playerId),
    redistributeAmount,
  );
  return fixZeroSumRounding(result, scoringEntries.map((entry) => entry.playerId));
}

function distributeAmountAmong<T extends { playerId: number; pointDelta: number }>(
  entries: T[],
  recipientIds: number[],
  totalAmount: number,
) {
  if (recipientIds.length === 0 || Math.abs(totalAmount) <= 0.01) {
    return;
  }

  const share = round2(totalAmount / recipientIds.length);
  for (const playerId of recipientIds) {
    const entry = entries.find((row) => row.playerId === playerId);
    if (entry) {
      entry.pointDelta = round2(entry.pointDelta + share);
    }
  }
}

function fixZeroSumRounding<T extends { playerId: number; pointDelta: number }>(
  entries: T[],
  scoringPlayerIds: number[],
): T[] {
  const total = round2(entries.reduce((sum, entry) => sum + entry.pointDelta, 0));
  const fix = round2(-total);
  if (Math.abs(fix) <= 0.01 || scoringPlayerIds.length === 0) {
    return entries;
  }

  const target = entries.find((entry) => entry.playerId === scoringPlayerIds[0]);
  if (target) {
    target.pointDelta = round2(target.pointDelta + fix);
  }
  return entries;
}

export function mergeCalculatedEntriesWithGhostZeros(
  calculated: Array<{ playerId: number; pointDelta: number }>,
  allPlayerIds: number[],
  ghostPlayerIds: Set<number>,
  options?: GhostRedistributionOptions,
): Array<{ playerId: number; pointDelta: number }> {
  const byId = new Map(
    calculated.map((entry) => [entry.playerId, entry.pointDelta]),
  );

  const entries = allPlayerIds.map((playerId) => ({
    playerId,
    pointDelta: byId.get(playerId) ?? 0,
  }));

  return applyGhostPlayerZeroDeltas(entries, ghostPlayerIds, options);
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
