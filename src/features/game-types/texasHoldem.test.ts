import { calculateTexasHoldemRound } from "./texasHoldem";

describe("calculateTexasHoldemRound", () => {
  it("returns a zero-sum round when totals balance", () => {
    const result = calculateTexasHoldemRound({
      entries: [
        { playerId: "a", pointDelta: 12 },
        { playerId: "b", pointDelta: -7 },
        { playerId: "c", pointDelta: -5 },
      ],
    });

    expect(result.total).toBe(0);
    expect(result.isZeroSum).toBe(true);
  });

  it("keeps the non-zero total for confirmation flows", () => {
    const result = calculateTexasHoldemRound({
      entries: [
        { playerId: "a", pointDelta: 10 },
        { playerId: "b", pointDelta: -3 },
      ],
    });

    expect(result.total).toBe(7);
    expect(result.isZeroSum).toBe(false);
    expect(result.summary).toContain("a +10");
  });
});
