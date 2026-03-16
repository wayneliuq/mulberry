import { calculateFightTheLandlordRound } from "./fightTheLandlord";

describe("calculateFightTheLandlordRound", () => {
  it("stays zero-sum when the landlord side wins with simple selections", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["p1", "p2", "p3", "p4"],
      landlordSideSelections: ["p1", "p2"], // one selection each
      outcome: "won",
      pointBasis: 2,
      numBombs: 1,
      gameMultiplier: 1,
    });

    // landlordPointsBase = 2 * 1 * (1 + 1) = 4
    // S = 2 selections -> totalLandlordSidePoints = 8
    // Winners: p1 (+4), p2 (+4)
    // Opponents: p3, p4 -> each -4
    expect(result.entries).toEqual([
      { playerId: "p1", pointDelta: 4 },
      { playerId: "p2", pointDelta: 4 },
      { playerId: "p3", pointDelta: -4 },
      { playerId: "p4", pointDelta: -4 },
    ]);
    expect(result.total).toBeCloseTo(0);
    expect(result.isZeroSum).toBe(true);
  });

  it("applies multiple selections per player when landlord side wins", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["A", "B", "C", "D"],
      landlordSideSelections: ["A", "A", "B"], // A twice, B once
      outcome: "won",
      pointBasis: 1,
      numBombs: 2,
      gameMultiplier: 2,
    });

    // landlordPointsBase = 1 * 2 * (2 + 1) = 6
    // S = 3 selections -> totalLandlordSidePoints = 18
    // A: 2 * 6 = +12, B: 1 * 6 = +6
    // Opponents: C, D -> total loss 18, each -9
    expect(result.entries).toEqual([
      { playerId: "A", pointDelta: 12 },
      { playerId: "B", pointDelta: 6 },
      { playerId: "C", pointDelta: -9 },
      { playerId: "D", pointDelta: -9 },
    ]);
    expect(result.total).toBeCloseTo(0);
  });

  it("distributes landlord-side loss evenly to opponents when landlord side loses", () => {
    const result = calculateFightTheLandlordRound({
      activePlayerIds: ["L1", "L2", "O1", "O2", "O3"],
      landlordSideSelections: ["L1", "L1", "L2"], // three selections total
      outcome: "lost",
      pointBasis: 3,
      numBombs: 0,
      gameMultiplier: 1,
    });

    // landlordPointsBase = 3 * 1 * (0 + 1) = 3
    // outcome = lost -> landlordPoints = -3
    // S = 3 -> totalLandlordSidePoints = -9
    // L1: 2 * -3 = -6, L2: 1 * -3 = -3
    // Opponents: O1, O2, O3 -> total gain 9, each +3
    expect(result.entries).toEqual([
      { playerId: "L1", pointDelta: -6 },
      { playerId: "L2", pointDelta: -3 },
      { playerId: "O1", pointDelta: 3 },
      { playerId: "O2", pointDelta: 3 },
      { playerId: "O3", pointDelta: 3 },
    ]);
    expect(result.total).toBeCloseTo(0);
  });

  it("throws if there is no opposing side", () => {
    expect(() =>
      calculateFightTheLandlordRound({
        activePlayerIds: ["A", "B", "C"],
        landlordSideSelections: ["A", "B", "C"],
        outcome: "won",
        pointBasis: 1,
        numBombs: 0,
        gameMultiplier: 1,
      }),
    ).toThrow(/at least one opposing player/i);
  });

  it("requires at least one landlord-side selection", () => {
    expect(() =>
      calculateFightTheLandlordRound({
        activePlayerIds: ["A", "B", "C"],
        landlordSideSelections: [],
        outcome: "won",
        pointBasis: 1,
        numBombs: 0,
        gameMultiplier: 1,
      }),
    ).toThrow();
  });
});
