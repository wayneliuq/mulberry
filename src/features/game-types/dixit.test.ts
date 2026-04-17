import { calculateDixitRound } from "./dixit";

function expectZeroSum(entries: { pointDelta: number }[]) {
  const t = Math.round(
    entries.reduce((s, e) => s + e.pointDelta, 0) * 100,
  ) / 100;
  expect(t).toBe(0);
}

describe("calculateDixitRound", () => {
  it("zeros a simple symmetric raw total", () => {
    const result = calculateDixitRound({
      entries: [
        { playerId: 1, pointDelta: 1, joinOrder: 1 },
        { playerId: 2, pointDelta: 1, joinOrder: 2 },
        { playerId: 3, pointDelta: 1, joinOrder: 3 },
      ],
    });
    expectZeroSum(result.entries);
    expect(result.entries.map((e) => e.pointDelta)).toEqual([0, 0, 0]);
    expect(result.isZeroSum).toBe(true);
  });

  it("distributes a two-player imbalance", () => {
    const result = calculateDixitRound({
      entries: [
        { playerId: 1, pointDelta: 1, joinOrder: 1 },
        { playerId: 2, pointDelta: 0, joinOrder: 2 },
      ],
    });
    expectZeroSum(result.entries);
    expect(result.entries.find((e) => e.playerId === 1)?.pointDelta).toBe(0.5);
    expect(result.entries.find((e) => e.playerId === 2)?.pointDelta).toBe(-0.5);
  });

  it("applies residual correction on lowest join order", () => {
    const result = calculateDixitRound({
      entries: [
        { playerId: "a", pointDelta: 10, joinOrder: 3 },
        { playerId: "b", pointDelta: 0, joinOrder: 1 },
        { playerId: "c", pointDelta: 0, joinOrder: 2 },
      ],
    });
    expectZeroSum(result.entries);
    const byId = Object.fromEntries(
      result.entries.map((e) => [String(e.playerId), e.pointDelta]),
    );
    expect(byId.b).toBe(-3.34);
    expect(byId.c).toBe(-3.33);
    expect(byId.a).toBe(6.67);
  });

  it("treats all-zero raw as a neutral round", () => {
    const result = calculateDixitRound({
      entries: [
        { playerId: 1, pointDelta: 0, joinOrder: 1 },
        { playerId: 2, pointDelta: 0, joinOrder: 2 },
      ],
    });
    expectZeroSum(result.entries);
    expect(result.entries.every((e) => e.pointDelta === 0)).toBe(true);
  });

  it("handles a negative raw total", () => {
    const result = calculateDixitRound({
      entries: [
        { playerId: 1, pointDelta: -3, joinOrder: 1 },
        { playerId: 2, pointDelta: 0, joinOrder: 2 },
        { playerId: 3, pointDelta: 0, joinOrder: 3 },
      ],
    });
    expectZeroSum(result.entries);
    expect(result.entries.find((e) => e.playerId === 1)?.pointDelta).toBe(-2);
    expect(result.entries.find((e) => e.playerId === 2)?.pointDelta).toBe(1);
    expect(result.entries.find((e) => e.playerId === 3)?.pointDelta).toBe(1);
  });
});
