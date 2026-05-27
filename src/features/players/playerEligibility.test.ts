import { describe, expect, it } from "vitest";
import {
  balanceManualEntriesExcludingGhosts,
  isLeaderboardEligible,
  isNearZeroPointDelta,
  isScoreNeutralHidden,
  mergeCalculatedEntriesWithGhostZeros,
} from "./playerEligibility";

describe("playerEligibility", () => {
  it("identifies score-neutral hidden players", () => {
    expect(isScoreNeutralHidden({ isScoreNeutralHidden: true })).toBe(true);
    expect(isLeaderboardEligible({ isScoreNeutralHidden: true })).toBe(false);
    expect(isLeaderboardEligible({ isScoreNeutralHidden: false })).toBe(true);
  });

  it("treats near-zero deltas as zero", () => {
    expect(isNearZeroPointDelta(0)).toBe(true);
    expect(isNearZeroPointDelta(0.005)).toBe(true);
    expect(isNearZeroPointDelta(0.02)).toBe(false);
  });

  it("merges calculated entries with ghost zeros", () => {
    const merged = mergeCalculatedEntriesWithGhostZeros(
      [
        { playerId: 1, pointDelta: 5 },
        { playerId: 2, pointDelta: -5 },
      ],
      [1, 2, 3],
      new Set([3]),
    );

    expect(merged).toEqual([
      { playerId: 1, pointDelta: 5 },
      { playerId: 2, pointDelta: -5 },
      { playerId: 3, pointDelta: 0 },
    ]);
  });

  it("balances manual entries without assigning points to ghosts", () => {
    const result = balanceManualEntriesExcludingGhosts(
      [
        { playerId: 1, pointDelta: 10 },
        { playerId: 2, pointDelta: 0 },
        { playerId: 3, pointDelta: 0 },
      ],
      new Set([3]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const byId = new Map(result.entries.map((entry) => [entry.playerId, entry.pointDelta]));
    expect(byId.get(3)).toBe(0);
    expect(Math.abs(result.total)).toBeLessThanOrEqual(0.01);
  });
});
