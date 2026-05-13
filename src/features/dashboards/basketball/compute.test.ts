import { beforeEach, describe, expect, it } from "vitest";
import { buildBasketballDashboardMetrics } from "./compute";
import { NBA_COMP_ANCHOR_STORAGE_KEY } from "./constants";
import {
  createMemoryNbaCompStorage,
  NBA_COMPARISON_PLAYER_POOL,
  type ComparisonVector,
  type NbaCompStorageAdapter,
} from "./nbaComparisons";
import type { BasketballDashboardData } from "../../../lib/api/types";

function makeRound(args: {
  idx: number;
  teamA: number[];
  teamB: number[];
  scoreA: number;
  scoreB: number;
}) {
  return {
    roundId: `r-${args.idx}`,
    gameId: "g-1",
    roundNumber: args.idx,
    createdAt: `2026-01-${String((args.idx % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    teamAPlayerIds: args.teamA,
    teamBPlayerIds: args.teamB,
    scoreTeamA: args.scoreA,
    scoreTeamB: args.scoreB,
  };
}

function makeEntries(roundId: string, winners: number[], losers: number[]) {
  return [
    ...winners.map((playerId) => ({ roundId, playerId, pointDelta: 1 })),
    ...losers.map((playerId) => ({ roundId, playerId, pointDelta: -1 })),
  ];
}

describe("buildBasketballDashboardMetrics", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(NBA_COMP_ANCHOR_STORAGE_KEY);
    }
  });
  it("builds all dashboard sections and computes combo lift using together vs apart", () => {
    const players = [
      { id: 1, displayName: "Alice", familyId: "red" },
      { id: 2, displayName: "Bob", familyId: "blue" },
      { id: 3, displayName: "Cara", familyId: "red" },
      { id: 4, displayName: "Duke", familyId: "green" },
    ];
    const rounds = [];
    const entries = [];
    let idx = 1;

    // Together: Alice + Bob mostly win
    for (let i = 0; i < 16; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 2],
        teamB: [3, 4],
        scoreA: 11,
        scoreB: 8,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [1, 2], [3, 4]));
    }
    for (let i = 0; i < 8; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 2],
        teamB: [3, 4],
        scoreA: 8,
        scoreB: 11,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [3, 4], [1, 2]));
    }

    // Apart: Alice vs Bob, Alice mostly loses
    for (let i = 0; i < 8; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 3],
        teamB: [2, 4],
        scoreA: 7,
        scoreB: 11,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [2, 4], [1, 3]));
    }
    for (let i = 0; i < 8; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 3],
        teamB: [2, 4],
        scoreA: 11,
        scoreB: 9,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [1, 3], [2, 4]));
    }

    const data: BasketballDashboardData = {
      players,
      rounds,
      roundEntries: entries,
    };
    const result = buildBasketballDashboardMetrics({ data, maxRounds: 500 });

    expect(result.splitSections.map((s) => s.id)).toEqual(
      expect.arrayContaining(["combos", "clutch", "carry", "consistency", "trios", "families"]),
    );
    expect(result.sections.map((s) => s.id)).toEqual(
      expect.arrayContaining(["rivalry", "upset", "balanced"]),
    );

    const combos = result.splitSections.find((section) => section.id === "combos");
    expect(combos).toBeTruthy();
    expect(combos?.positiveRows.length).toBeGreaterThan(0);
    expect(combos?.positiveRows[0]?.label).toContain("Alice + Bob");
    expect(combos?.positiveRows[0]?.value).toBeGreaterThan(0);

    const rivalry = result.sections.find((section) => section.id === "rivalry");
    expect(rivalry?.rows.length).toBeGreaterThan(0);
  });

  it("ranks rivalry board by combined parity and volume score", () => {
    const players = [
      { id: 1, displayName: "Alice", familyId: "red" },
      { id: 2, displayName: "Bob", familyId: "blue" },
      { id: 3, displayName: "Yuri", familyId: "green" },
      { id: 4, displayName: "Zoe", familyId: "yellow" },
    ];
    const rounds = [];
    const entries = [];
    let idx = 1;

    // Alice vs Bob: lopsided 9-1.
    for (let i = 0; i < 9; i++) {
      const round = makeRound({ idx: idx++, teamA: [1], teamB: [2], scoreA: 11, scoreB: 8 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [1], [2]));
    }
    {
      const round = makeRound({ idx: idx++, teamA: [1], teamB: [2], scoreA: 8, scoreB: 11 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [2], [1]));
    }

    // Yuri vs Zoe: balanced 5-5.
    for (let i = 0; i < 5; i++) {
      const round = makeRound({ idx: idx++, teamA: [3], teamB: [4], scoreA: 11, scoreB: 9 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [3], [4]));
    }
    for (let i = 0; i < 5; i++) {
      const round = makeRound({ idx: idx++, teamA: [3], teamB: [4], scoreA: 8, scoreB: 11 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [4], [3]));
    }

    const data: BasketballDashboardData = {
      players,
      rounds,
      roundEntries: entries,
    };
    const result = buildBasketballDashboardMetrics({ data, maxRounds: 500 });
    const rivalry = result.sections.find((section) => section.id === "rivalry");

    expect(rivalry?.rows[0]?.label).toBe("Yuri vs Zoe");
    expect(rivalry?.rows[0]?.valueLabel).toBe("78.8%");
    expect(rivalry?.rows[0]?.details).toContain("5-5 head-to-head");
  });

  it("prefers higher-volume rivalries when parity is equal", () => {
    const players = [
      { id: 1, displayName: "Alice", familyId: "red" },
      { id: 2, displayName: "Bob", familyId: "blue" },
      { id: 3, displayName: "Yuri", familyId: "green" },
      { id: 4, displayName: "Zoe", familyId: "yellow" },
    ];
    const rounds = [];
    const entries = [];
    let idx = 1;

    // Alice vs Bob: perfect parity at minimum rivalry sample (5-5).
    for (let i = 0; i < 5; i++) {
      const round = makeRound({ idx: idx++, teamA: [1], teamB: [2], scoreA: 11, scoreB: 9 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [1], [2]));
    }
    for (let i = 0; i < 5; i++) {
      const round = makeRound({ idx: idx++, teamA: [1], teamB: [2], scoreA: 9, scoreB: 11 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [2], [1]));
    }

    // Yuri vs Zoe: same parity but larger sample (10-10).
    for (let i = 0; i < 10; i++) {
      const round = makeRound({ idx: idx++, teamA: [3], teamB: [4], scoreA: 11, scoreB: 9 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [3], [4]));
    }
    for (let i = 0; i < 10; i++) {
      const round = makeRound({ idx: idx++, teamA: [3], teamB: [4], scoreA: 8, scoreB: 11 });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [4], [3]));
    }

    const data: BasketballDashboardData = {
      players,
      rounds,
      roundEntries: entries,
    };
    const result = buildBasketballDashboardMetrics({ data, maxRounds: 500 });
    const rivalry = result.sections.find((section) => section.id === "rivalry");

    expect(rivalry?.rows[0]?.label).toBe("Yuri vs Zoe");
    expect(rivalry?.rows[1]?.label).toBe("Alice vs Bob");
    expect((rivalry?.rows[0]?.value ?? 0)).toBeGreaterThan(rivalry?.rows[1]?.value ?? 0);
  });

  it("ranks families by same-team percentage and includes together-vs-apart note", () => {
    const players = [
      { id: 1, displayName: "Alice", familyId: "red" },
      { id: 2, displayName: "Bob", familyId: "blue" },
      { id: 3, displayName: "Cara", familyId: "green" },
      { id: 4, displayName: "Duke", familyId: "yellow" },
    ];
    const rounds = [];
    const entries = [];
    let idx = 1;

    // Alice + Bob together for 20 rounds.
    for (let i = 0; i < 14; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 2],
        teamB: [3, 4],
        scoreA: 11,
        scoreB: 8,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [1, 2], [3, 4]));
    }
    for (let i = 0; i < 6; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 2],
        teamB: [3, 4],
        scoreA: 8,
        scoreB: 11,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [3, 4], [1, 2]));
    }

    // Alice and Bob apart for 4 rounds.
    {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 3],
        teamB: [2, 4],
        scoreA: 11,
        scoreB: 9,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [1, 3], [2, 4]));
    }
    for (let i = 0; i < 3; i++) {
      const round = makeRound({
        idx: idx++,
        teamA: [1, 3],
        teamB: [2, 4],
        scoreA: 8,
        scoreB: 11,
      });
      rounds.push(round);
      entries.push(...makeEntries(round.roundId, [2, 4], [1, 3]));
    }

    const data: BasketballDashboardData = {
      players,
      rounds,
      roundEntries: entries,
    };
    const result = buildBasketballDashboardMetrics({ data, maxRounds: 500 });
    const families = result.splitSections.find((section) => section.id === "families");

    expect(families?.positiveRows[0]?.label).toBe("Alice + Bob");
    expect(families?.positiveRows[0]?.valueLabel).toBe("83.3%");
    expect(families?.positiveRows[0]?.details).toContain("win-rate delta +20.0% vs apart");
    expect(families?.negativeRows).toEqual([]);
  });

  it("nba comparisons assign distinct NBA players (LeBron-era pool includes Yao)", () => {
    expect(NBA_COMPARISON_PLAYER_POOL.some((p) => p.id === "yao")).toBe(true);
    const players = [
      { id: 1, displayName: "A", familyId: "f1" },
      { id: 2, displayName: "B", familyId: "f2" },
      { id: 3, displayName: "C", familyId: "f3" },
      { id: 4, displayName: "D", familyId: "f4" },
    ];
    const rounds = Array.from({ length: 24 }).map((_, idx) => ({
      roundId: `r-${idx + 1}`,
      gameId: "g-1",
      roundNumber: idx + 1,
      createdAt: `2026-02-${String((idx % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3, 4],
      scoreTeamA: idx % 2 === 0 ? 11 : 8,
      scoreTeamB: idx % 2 === 0 ? 8 : 11,
    }));
    const roundEntries = Array.from({ length: 24 }).flatMap((_, idx) => {
      const roundId = `r-${idx + 1}`;
      const aWon = idx % 2 === 0;
      return [
        { roundId, playerId: 1, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 2, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 3, pointDelta: aWon ? -1 : 1 },
        { roundId, playerId: 4, pointDelta: aWon ? -1 : 1 },
      ];
    });
    const data: BasketballDashboardData = { players, rounds, roundEntries };
    const once = buildBasketballDashboardMetrics({ data, maxRounds: 500 });
    const twice = buildBasketballDashboardMetrics({ data, maxRounds: 500 });
    const nbaOnce = once.nbaComparisons;
    const nbaTwice = twice.nbaComparisons;
    expect(nbaOnce.length).toBe(4);
    expect(nbaTwice).toEqual(nbaOnce);
    const nbaNames = nbaOnce.map((row) => row.nbaMatchName);
    expect(new Set(nbaNames).size).toBe(4);
    for (let i = 0; i < nbaOnce.length - 1; i++) {
      expect(nbaOnce[i]!.fitScore).toBeGreaterThanOrEqual(nbaOnce[i + 1]!.fitScore);
    }
    for (const row of nbaOnce) {
      expect(row.playerName).toMatch(/^[A-D]$/);
      expect(row.fitScore).toBeGreaterThan(0);
      expect(row.fitScore).toBeLessThanOrEqual(1);
    }
  });

  it("keeps identical NBA comps across reloads when hysteresis is wide (memory storage)", () => {
    const storage = createMemoryNbaCompStorage(null);
    const players = [
      { id: 1, displayName: "A", familyId: "f1" },
      { id: 2, displayName: "B", familyId: "f2" },
      { id: 3, displayName: "C", familyId: "f3" },
      { id: 4, displayName: "D", familyId: "f4" },
    ];
    const rounds = Array.from({ length: 24 }).map((_, idx) => ({
      roundId: `r-${idx + 1}`,
      gameId: "g-1",
      roundNumber: idx + 1,
      createdAt: `2026-02-${String((idx % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3, 4],
      scoreTeamA: idx % 2 === 0 ? 11 : 8,
      scoreTeamB: idx % 2 === 0 ? 8 : 11,
    }));
    const roundEntries = Array.from({ length: 24 }).flatMap((_, idx) => {
      const roundId = `r-${idx + 1}`;
      const aWon = idx % 2 === 0;
      return [
        { roundId, playerId: 1, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 2, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 3, pointDelta: aWon ? -1 : 1 },
        { roundId, playerId: 4, pointDelta: aWon ? -1 : 1 },
      ];
    });
    const data: BasketballDashboardData = { players, rounds, roundEntries };
    const opts = { nbaCompStorage: storage, nbaCompHysteresisTau: 1e9 };
    const first = buildBasketballDashboardMetrics({ data, maxRounds: 500 }, opts);
    const second = buildBasketballDashboardMetrics({ data, maxRounds: 500 }, opts);
    expect(second.nbaComparisons).toEqual(first.nbaComparisons);
  });

  it("falls back to cold assignment when storage never persists (noop adapter)", () => {
    const noopStorage: NbaCompStorageAdapter = {
      load: () => null,
      save: () => {},
    };
    const players = [
      { id: 1, displayName: "A", familyId: "f1" },
      { id: 2, displayName: "B", familyId: "f2" },
      { id: 3, displayName: "C", familyId: "f3" },
      { id: 4, displayName: "D", familyId: "f4" },
    ];
    const rounds = Array.from({ length: 24 }).map((_, idx) => ({
      roundId: `r-${idx + 1}`,
      gameId: "g-1",
      roundNumber: idx + 1,
      createdAt: `2026-02-${String((idx % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3, 4],
      scoreTeamA: idx % 2 === 0 ? 11 : 8,
      scoreTeamB: idx % 2 === 0 ? 8 : 11,
    }));
    const roundEntries = Array.from({ length: 24 }).flatMap((_, idx) => {
      const roundId = `r-${idx + 1}`;
      const aWon = idx % 2 === 0;
      return [
        { roundId, playerId: 1, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 2, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 3, pointDelta: aWon ? -1 : 1 },
        { roundId, playerId: 4, pointDelta: aWon ? -1 : 1 },
      ];
    });
    const data: BasketballDashboardData = { players, rounds, roundEntries };
    const a = buildBasketballDashboardMetrics(
      { data, maxRounds: 500 },
      { nbaCompStorage: noopStorage },
    );
    const b = buildBasketballDashboardMetrics(
      { data, maxRounds: 500 },
      { nbaCompStorage: noopStorage },
    );
    expect(b.nbaComparisons).toEqual(a.nbaComparisons);
  });

  it("previousMatchName reflects last display name when a rematch picks a different NBA", () => {
    const storage = createMemoryNbaCompStorage(null);
    const players = [
      { id: 1, displayName: "A", familyId: "f1" },
      { id: 2, displayName: "B", familyId: "f2" },
      { id: 3, displayName: "C", familyId: "f3" },
      { id: 4, displayName: "D", familyId: "f4" },
    ];
    const rounds = Array.from({ length: 24 }).map((_, idx) => ({
      roundId: `r-${idx + 1}`,
      gameId: "g-1",
      roundNumber: idx + 1,
      createdAt: `2026-02-${String((idx % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3, 4],
      scoreTeamA: idx % 2 === 0 ? 11 : 8,
      scoreTeamB: idx % 2 === 0 ? 8 : 11,
    }));
    const roundEntries = Array.from({ length: 24 }).flatMap((_, idx) => {
      const roundId = `r-${idx + 1}`;
      const aWon = idx % 2 === 0;
      return [
        { roundId, playerId: 1, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 2, pointDelta: aWon ? 1 : -1 },
        { roundId, playerId: 3, pointDelta: aWon ? -1 : 1 },
        { roundId, playerId: 4, pointDelta: aWon ? -1 : 1 },
      ];
    });
    const data: BasketballDashboardData = { players, rounds, roundEntries };
    buildBasketballDashboardMetrics({ data, maxRounds: 500 }, { nbaCompStorage: storage });

    const store = storage.load()!;
    const bogus: ComparisonVector = {
      winImpact: 0.01,
      carryBias: 0.01,
      consistency: 0.01,
      clutchDelta: 0.01,
      upsetFactor: 0.01,
      chemistryBias: 0.01,
      personaIntensity: 0.01,
      overperformance: 0.01,
    };
    // Use a low-signal archetype unlikely to be player A's first greedy pick.
    store[1] = { vector: bogus, nbaId: "beverley", anchoredAt: Date.now() };
    storage.save(store);

    const second = buildBasketballDashboardMetrics(
      { data, maxRounds: 500 },
      { nbaCompStorage: storage, nbaCompHysteresisTau: 0.08, nbaCompStickiness: 0 },
    );

    const rowA = second.nbaComparisons.find((r) => r.playerName === "A");
    expect(rowA?.previousMatchName).toBe("Patrick Beverley");
    expect(rowA?.nbaMatchName).not.toBe("Patrick Beverley");
  });
});
