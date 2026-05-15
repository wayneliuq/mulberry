import { describe, expect, it } from "vitest";
import {
  balanceManualPointEntries,
  isAutoEligible,
  round2,
} from "./manualPointBalance";

function expectZeroSum(entries: { pointDelta: number }[]) {
  const total = round2(
    entries.reduce((sum, entry) => sum + entry.pointDelta, 0),
  );
  expect(Math.abs(total)).toBeLessThanOrEqual(0.01);
}

describe("isAutoEligible", () => {
  it("treats zero and near-zero as auto-eligible", () => {
    expect(isAutoEligible(0)).toBe(true);
    expect(isAutoEligible(0.004)).toBe(true);
    expect(isAutoEligible(0.01)).toBe(false);
    expect(isAutoEligible(-10)).toBe(false);
  });
});

describe("balanceManualPointEntries", () => {
  it("distributes one manual winner among zero auto slots", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: 10 },
      { playerId: 2, pointDelta: 0 },
      { playerId: 3, pointDelta: 0 },
      { playerId: 4, pointDelta: 0 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectZeroSum(result.entries);
    expect(result.entries.find((e) => e.playerId === 1)?.pointDelta).toBe(10);
    const autoDeltas = result.entries
      .filter((e) => e.playerId !== 1)
      .map((e) => e.pointDelta);
    expect(round2(autoDeltas.reduce((s, d) => s + d, 0))).toBe(-10);
  });

  it("distributes one manual loser among zero auto slots", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: -10 },
      { playerId: 2, pointDelta: 0 },
      { playerId: 3, pointDelta: 0 },
      { playerId: 4, pointDelta: 0 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectZeroSum(result.entries);
    expect(result.entries.find((e) => e.playerId === 1)?.pointDelta).toBe(-10);
    const autoDeltas = result.entries
      .filter((e) => e.playerId !== 1)
      .map((e) => e.pointDelta);
    expect(round2(autoDeltas.reduce((s, d) => s + d, 0))).toBe(10);
  });

  it("handles 7 players with -10 manual and six auto slots", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: -10 },
      { playerId: 2, pointDelta: 0 },
      { playerId: 3, pointDelta: 0 },
      { playerId: 4, pointDelta: 0 },
      { playerId: 5, pointDelta: 0 },
      { playerId: 6, pointDelta: 0 },
      { playerId: 7, pointDelta: 0 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectZeroSum(result.entries);
    expect(result.isZeroSum).toBe(true);
  });

  it("returns all zeros when every slot is auto-eligible", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: 0 },
      { playerId: 2, pointDelta: 0 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries.every((e) => e.pointDelta === 0)).toBe(true);
    expect(result.isZeroSum).toBe(true);
  });

  it("preserves manual values that already sum to zero", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: 10 },
      { playerId: 2, pointDelta: -10 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectZeroSum(result.entries);
    expect(result.entries.find((e) => e.playerId === 1)?.pointDelta).toBe(10);
    expect(result.entries.find((e) => e.playerId === 2)?.pointDelta).toBe(-10);
  });

  it("fails when all slots are manual and unbalanced", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: 10 },
      { playerId: 2, pointDelta: 5 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("no_auto_slots");
  });

  it("rebalances when one manual changes and others stay at zero", () => {
    const result = balanceManualPointEntries([
      { playerId: 1, pointDelta: 0 },
      { playerId: 2, pointDelta: -3.33 },
      { playerId: 3, pointDelta: -3.33 },
      { playerId: 4, pointDelta: -3.34 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectZeroSum(result.entries);
    expect(result.entries.find((e) => e.playerId === 1)?.pointDelta).toBe(10);
  });
});
