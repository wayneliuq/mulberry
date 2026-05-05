import { describe, expect, it } from "vitest";
import { buildBasketballDashboardMetrics } from "./compute";
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
});
