import { calculateFightTheLandlordRound } from "./fightTheLandlord";

describe("calculateFightTheLandlordRound", () => {
  it("stays zero-sum when the landlord side wins", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["landlord", "friend", "p3", "p4", "p5"],
      landlordId: "landlord",
      landlordFriendIds: ["friend"],
      outcome: "won",
      pointBasis: 2,
      bombMultiplier: 3,
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

  it("distributes remainder by active player order", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["landlord", "p2", "p3", "p4"],
      landlordId: "landlord",
      landlordFriendIds: [],
      outcome: "lost",
      pointBasis: 5,
      bombMultiplier: 1,
      landlordMultiplier: 1,
    });

    expect(result.entries).toEqual([
      { playerId: "landlord", pointDelta: -5 },
      { playerId: "p2", pointDelta: 2 },
      { playerId: "p3", pointDelta: 2 },
      { playerId: "p4", pointDelta: 1 },
    ]);
    expect(result.total).toBe(0);
  });
});
