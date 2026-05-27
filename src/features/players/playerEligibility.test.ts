import { describe, expect, it } from "vitest";
import {
  applyGhostPlayerZeroDeltas,
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

  it("redistributes ghost basketball deltas within team to preserve zero-sum", () => {
    const merged = mergeCalculatedEntriesWithGhostZeros(
      [
        { playerId: 1, pointDelta: 3 },
        { playerId: 2, pointDelta: -3 },
        { playerId: 3, pointDelta: 3 },
        { playerId: 99, pointDelta: -3 },
      ],
      [1, 2, 3, 99],
      new Set([99]),
      {
        teamByPlayerId: new Map([
          [1, "A"],
          [2, "A"],
          [3, "B"],
          [99, "A"],
        ]),
      },
    );

    expect(merged.find((e) => e.playerId === 99)?.pointDelta).toBe(0);
    const total = merged.reduce((sum, entry) => sum + entry.pointDelta, 0);
    expect(Math.abs(total)).toBeLessThanOrEqual(0.01);
    expect(merged.find((e) => e.playerId === 1)?.pointDelta).toBe(1.5);
    expect(merged.find((e) => e.playerId === 2)?.pointDelta).toBe(-4.5);
  });

  it("redistributes ghost-only team drain to opposing scorers", () => {
    const merged = applyGhostPlayerZeroDeltas(
      [
        { playerId: 99, pointDelta: -12 },
        { playerId: 2, pointDelta: 6 },
        { playerId: 3, pointDelta: 6 },
      ],
      new Set([99]),
      {
        teamByPlayerId: new Map([
          [99, "A"],
          [2, "B"],
          [3, "B"],
        ]),
      },
    );

    expect(merged.find((e) => e.playerId === 99)?.pointDelta).toBe(0);
    const total = merged.reduce((sum, entry) => sum + entry.pointDelta, 0);
    expect(Math.abs(total)).toBeLessThanOrEqual(0.01);
    expect(merged.find((e) => e.playerId === 2)?.pointDelta).toBe(0);
    expect(merged.find((e) => e.playerId === 3)?.pointDelta).toBe(0);
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
