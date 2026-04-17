import { calculateWerewolvesRound } from "./werewolves";

describe("calculateWerewolvesRound", () => {
  it("allocates the full pool from losers to winners and is zero-sum", () => {
    const result = calculateWerewolvesRound({
      activePlayerIds: ["p1", "p2", "p3", "p4"],
      pointBasis: 10,
      playerAssignments: [
        { playerId: "p1", team: "villager" },
        { playerId: "p2", team: "villager" },
        { playerId: "p3", team: "villager" },
        { playerId: "p4", team: "werewolf" },
      ],
      survivedPlayerIds: [],
      winningTeamIds: ["villager"],
    });

    expect(result.total).toBeCloseTo(0);
    expect(result.isZeroSum).toBe(true);

    const byPlayer = new Map(
      result.entries.map((e) => [String(e.playerId), e.pointDelta]),
    );
    expect(byPlayer.get("p1")).toBeGreaterThan(0);
    expect(byPlayer.get("p2")).toBeGreaterThan(0);
    expect(byPlayer.get("p3")).toBeGreaterThan(0);
    expect(byPlayer.get("p4")).toBeLessThan(0);

    const pool = 4 * 10;
    const totalTransfer = pool;
    const totalWon =
      (byPlayer.get("p1") ?? 0) +
      (byPlayer.get("p2") ?? 0) +
      (byPlayer.get("p3") ?? 0);
    const totalLost = Math.abs(byPlayer.get("p4") ?? 0);
    expect(totalWon).toBeCloseTo(totalTransfer);
    expect(totalLost).toBeCloseTo(totalTransfer);
  });

  it("applies survival pool: pointBasis shared among survivors, funded by dead", () => {
    const result = calculateWerewolvesRound({
      activePlayerIds: ["a", "b", "c", "d"],
      pointBasis: 1,
      playerAssignments: [
        { playerId: "a", team: "villager" },
        { playerId: "b", team: "villager" },
        { playerId: "c", team: "werewolf" },
        { playerId: "d", team: "werewolf" },
      ],
      survivedPlayerIds: ["a", "c"],
      winningTeamIds: ["villager"],
    });

    expect(result.total).toBeCloseTo(0);
    expect(result.isZeroSum).toBe(true);

    const byPlayer = new Map(
      result.entries.map((e) => [String(e.playerId), e.pointDelta]),
    );
    const a = byPlayer.get("a") ?? 0;
    const b = byPlayer.get("b") ?? 0;
    const c = byPlayer.get("c") ?? 0;
    const d = byPlayer.get("d") ?? 0;

    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    expect(c).toBeLessThan(0);
    expect(d).toBeLessThan(0);

    const survived = ["a", "c"];
    const dead = ["b", "d"];
    const survivedSum = survived.reduce(
      (s, id) => s + (byPlayer.get(id) ?? 0),
      0,
    );
    const deadSum = dead.reduce((s, id) => s + (byPlayer.get(id) ?? 0), 0);

    expect(survivedSum + deadSum).toBeCloseTo(0);

    expect(a).toBeCloseTo(2.5, 5);
    expect(b).toBeCloseTo(1.5, 5);
    expect(c).toBeCloseTo(-1.5, 5);
    expect(d).toBeCloseTo(-2.5, 5);
  });

  it("rounds each player score to 1 decimal", () => {
    const result = calculateWerewolvesRound({
      activePlayerIds: ["x", "y", "z"],
      pointBasis: 5,
      playerAssignments: [
        { playerId: "x", team: "villager" },
        { playerId: "y", team: "villager" },
        { playerId: "z", team: "werewolf" },
      ],
      survivedPlayerIds: ["x", "y", "z"],
      winningTeamIds: ["villager"],
    });

    result.entries.forEach((entry) => {
      const decimals = String(entry.pointDelta).split(".")[1];
      expect(decimals?.length ?? 0).toBeLessThanOrEqual(1);
    });
  });

  it("throws when no winners or no losers", () => {
    expect(() =>
      calculateWerewolvesRound({
        activePlayerIds: ["a", "b", "c"],
        pointBasis: 1,
        playerAssignments: [
          { playerId: "a", team: "villager" },
          { playerId: "b", team: "villager" },
          { playerId: "c", team: "villager" },
        ],
        survivedPlayerIds: [],
        winningTeamIds: ["villager"],
      }),
    ).toThrow("at least one winning and one losing");

    expect(() =>
      calculateWerewolvesRound({
        activePlayerIds: ["a", "b", "c"],
        pointBasis: 1,
        playerAssignments: [
          { playerId: "a", team: "werewolf" },
          { playerId: "b", team: "werewolf" },
          { playerId: "c", team: "werewolf" },
        ],
        survivedPlayerIds: [],
        winningTeamIds: ["werewolf"],
      }),
    ).toThrow("at least one winning and one losing");
  });
});
