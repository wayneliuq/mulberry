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

/** Server and client agree a round balances within one cent. */
export const ZERO_SUM_ROUND_TOLERANCE = 0.01;

/** Only auto-correct sub-point rounding drift; larger gaps are real errors. */
export const ZERO_SUM_AUTO_FIX_MAX = 1;

export function roundEntryTotal(entries: Array<{ pointDelta: number }>): number {
  return round2(entries.reduce((sum, entry) => sum + entry.pointDelta, 0));
}

export function isRoundEntryTotalBalanced(
  total: number,
  tolerance = ZERO_SUM_ROUND_TOLERANCE,
): boolean {
  return Math.abs(total) <= tolerance;
}

export type NormalizeZeroSumOptions = {
  maxImbalance?: number;
  /** Apply remainder to players with |pointDelta| below this when possible (default 1). */
  preferAdjustBelow?: number;
};

/**
 * Rounds entries and absorbs |total| < maxImbalance (default 1) so the set is zero-sum.
 * Cent-level residuals go to a low-magnitude scorer when possible.
 */
export function normalizePointEntriesZeroSum<
  T extends { playerId: number; pointDelta: number },
>(
  entries: T[],
  adjustPlayerIds: number[],
  options?: NormalizeZeroSumOptions,
): T[] {
  const maxImbalance = options?.maxImbalance ?? ZERO_SUM_AUTO_FIX_MAX;
  const preferAdjustBelow = options?.preferAdjustBelow ?? 1;

  if (entries.length === 0 || adjustPlayerIds.length === 0) {
    return entries.map((entry) => ({ ...entry, pointDelta: round2(entry.pointDelta) }));
  }

  const result = entries.map((entry) => ({
    ...entry,
    pointDelta: round2(entry.pointDelta),
  }));

  let total = roundEntryTotal(result);
  if (Math.abs(total) < 0.0001) {
    return result;
  }
  if (Math.abs(total) >= maxImbalance) {
    return result;
  }

  let targets = adjustPlayerIds.filter((playerId) => {
    const entry = result.find((row) => row.playerId === playerId);
    return entry !== undefined && Math.abs(entry.pointDelta) < preferAdjustBelow;
  });
  if (targets.length === 0) {
    targets = [...adjustPlayerIds];
  }
  targets.sort((left, right) => left - right);

  if (Math.abs(total) <= ZERO_SUM_ROUND_TOLERANCE || targets.length === 1) {
    const entry = result.find((row) => row.playerId === targets[0]);
    if (entry) {
      entry.pointDelta = round2(entry.pointDelta - total);
    }
    return result;
  }

  const share = round2(-total / targets.length);
  for (const playerId of targets) {
    const entry = result.find((row) => row.playerId === playerId);
    if (entry) {
      entry.pointDelta = round2(entry.pointDelta + share);
    }
  }

  const remainder = roundEntryTotal(result);
  if (Math.abs(remainder) > 0.0001) {
    const entry = result.find((row) => row.playerId === targets[0]);
    if (entry) {
      entry.pointDelta = round2(entry.pointDelta - remainder);
    }
  }

  return result;
}

export function finalizeRoundPointEntriesForSubmit<
  T extends { playerId: number; pointDelta: number },
>(entries: T[], adjustPlayerIds: number[]): { entries: T[]; total: number; balanced: boolean } {
  const normalized = normalizePointEntriesZeroSum(entries, adjustPlayerIds);
  const total = roundEntryTotal(normalized);
  return {
    entries: normalized,
    total,
    balanced:
      Math.abs(total) < ZERO_SUM_AUTO_FIX_MAX &&
      isRoundEntryTotalBalanced(total),
  };
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
