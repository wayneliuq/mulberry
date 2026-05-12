import { describe, expect, it } from "vitest";
import { buildBasketballDashboardMetrics } from "./compute";
import { isExactlyThreeWords } from "./nbaComparisons";
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

  it("nbaComp section assigns distinct NBA comps with three-word reasons", () => {
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
    const nbaOnce = once.sections.find((s) => s.id === "nbaComp");
    const nbaTwice = twice.sections.find((s) => s.id === "nbaComp");
    expect(nbaOnce?.rows.length).toBe(4);
    expect(nbaTwice?.rows).toEqual(nbaOnce?.rows);
    const nbaNames = nbaOnce!.rows.map((row) => {
      const parts = row.label.split(" → ");
      expect(parts.length).toBe(2);
      return parts[1]!;
    });
    expect(new Set(nbaNames).size).toBe(4);
    for (const row of nbaOnce!.rows) {
      expect(isExactlyThreeWords(row.details)).toBe(true);
    }
  });
});
