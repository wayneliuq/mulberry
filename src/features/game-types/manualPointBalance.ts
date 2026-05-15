export type ManualPointEntry = {
  playerId: number;
  pointDelta: number;
};

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clampToTwoDecimals(value: number): number {
  return round2(value);
}

export function isAutoEligible(pointDelta: number): boolean {
  return Math.abs(round2(pointDelta)) < 0.01;
}

export type BalanceManualPointEntriesResult =
  | {
      ok: true;
      entries: ManualPointEntry[];
      total: number;
      isZeroSum: boolean;
    }
  | {
      ok: false;
      reason: "no_auto_slots";
    };

export function balanceManualPointEntries(
  entries: ManualPointEntry[],
): BalanceManualPointEntriesResult {
  if (entries.length === 0) {
    return {
      ok: true,
      entries: [],
      total: 0,
      isZeroSum: true,
    };
  }

  const sorted = [...entries].sort((a, b) => a.playerId - b.playerId);
  const manualSum = round2(
    sorted
      .filter((entry) => !isAutoEligible(entry.pointDelta))
      .reduce((sum, entry) => sum + round2(entry.pointDelta), 0),
  );

  const autoIndices: number[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (isAutoEligible(sorted[i]!.pointDelta)) {
      autoIndices.push(i);
    }
  }

  if (autoIndices.length === 0 && Math.abs(manualSum) > 0.01) {
    return { ok: false, reason: "no_auto_slots" };
  }

  const result: ManualPointEntry[] = sorted.map((entry) => ({
    playerId: entry.playerId,
    pointDelta: isAutoEligible(entry.pointDelta)
      ? 0
      : round2(entry.pointDelta),
  }));

  if (autoIndices.length > 0) {
    const share = round2(-manualSum / autoIndices.length);
    for (const index of autoIndices) {
      result[index] = {
        playerId: sorted[index]!.playerId,
        pointDelta: share,
      };
    }
  }

  const rounded = result.map((entry) => ({
    playerId: entry.playerId,
    pointDelta: round2(entry.pointDelta),
  }));

  const sumRounded = round2(
    rounded.reduce((sum, entry) => sum + entry.pointDelta, 0),
  );
  const fix = round2(-sumRounded);
  if (Math.abs(fix) > 0.0001) {
    const fixIndex = rounded.findIndex((entry) =>
      isAutoEligible(sorted.find((s) => s.playerId === entry.playerId)!.pointDelta),
    );
    const targetIndex = fixIndex >= 0 ? fixIndex : 0;
    rounded[targetIndex] = {
      ...rounded[targetIndex]!,
      pointDelta: round2(rounded[targetIndex]!.pointDelta + fix),
    };
  }

  const total = round2(
    rounded.reduce((sum, entry) => sum + entry.pointDelta, 0),
  );

  return {
    ok: true,
    entries: rounded,
    total,
    isZeroSum: Math.abs(total) <= 0.01,
  };
}

export function parseManualPointInputs(
  inputs: Record<number, string>,
  playerIds: number[],
): ManualPointEntry[] {
  return playerIds.map((playerId) => {
    const raw = Number(inputs[playerId] ?? 0);
    const pointDelta = Number.isFinite(raw) ? clampToTwoDecimals(raw) : 0;
    return { playerId, pointDelta };
  });
}

export const MANUAL_BALANCE_NO_AUTO_SLOTS_MESSAGE =
  "Set at least one player to 0 for auto-split, or balance totals manually.";
