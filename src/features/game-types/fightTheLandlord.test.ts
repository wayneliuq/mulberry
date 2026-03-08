import { calculateFightTheLandlordRound } from "./fightTheLandlord";

describe("calculateFightTheLandlordRound", () => {
  it("stays zero-sum when the landlord side wins", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["landlord", "friend", "p3", "p4", "p5"],
      landlordId: "landlord",
      landlordFriendIds: ["friend"],
      outcome: "won",
      pointBasis: 2,
      numBombs: 3,
      gameMultiplier: 1,
      landlordMultiplier: 2,
    });

    expect(result.total).toBe(0);
    expect(result.isZeroSum).toBe(true);
    expect(result.entries).toEqual([
      { playerId: "landlord", pointDelta: 12 },
      { playerId: "friend", pointDelta: 6 },
      { playerId: "p3", pointDelta: -6 },
      { playerId: "p4", pointDelta: -6 },
      { playerId: "p5", pointDelta: -6 },
    ]);
  });

  it("distributes loss evenly (decimal) when landlord loses", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["landlord", "p2", "p3", "p4"],
      landlordId: "landlord",
      landlordFriendIds: [],
      outcome: "lost",
      pointBasis: 5,
      numBombs: 1,
      gameMultiplier: 1,
      landlordMultiplier: 1,
    });

    expect(result.entries).toHaveLength(4);
    expect(result.entries.find((e) => e.playerId === "landlord")?.pointDelta).toBe(-5);
    const opponents = result.entries.filter((e) => e.playerId !== "landlord");
    expect(opponents).toHaveLength(3);
    opponents.forEach((e) => {
      expect(e.pointDelta).toBeCloseTo(5 / 3);
    });
    expect(result.total).toBeCloseTo(0);
  });
});
