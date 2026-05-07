import { describe, expect, it, vi } from "vitest";
import type { BasketballDashboardData } from "../../../lib/api/types";

const { predictMock } = vi.hoisted(() => ({
  predictMock: vi.fn(() => ({ teamAWinProb: 0.35, teamBWinProb: 0.65 })),
}));

const observedPriorLengths: number[] = [];

vi.mock("../../game-types/basketball", async () => {
  const actual = await vi.importActual<typeof import("../../game-types/basketball")>(
    "../../game-types/basketball",
  );
  return {
    ...actual,
    predictBasketballMatchWinProbabilities: predictMock,
  };
});

import { buildBasketballDashboardMetrics } from "./compute";

function makeRound(idx: number) {
  const scoreA = idx % 3 === 0 ? 8 : 11;
  const scoreB = idx % 3 === 0 ? 11 : 9;
  return {
    roundId: `r-${idx}`,
    gameId: "g-1",
    roundNumber: idx,
    createdAt: `2026-01-${String((idx % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    teamAPlayerIds: [1, 2],
    teamBPlayerIds: [3, 4],
    scoreTeamA: scoreA,
    scoreTeamB: scoreB,
  };
}

describe("upset section probability source", () => {
  it("uses the current rolling skill context for upset checks", () => {
    observedPriorLengths.length = 0;
    predictMock.mockClear();
    predictMock.mockImplementation((priors) => {
      observedPriorLengths.push(priors.length);
      return { teamAWinProb: 0.35, teamBWinProb: 0.65 };
    });
    const rounds = Array.from({ length: 24 }, (_, i) => makeRound(i + 1));
    const roundEntries = rounds.flatMap((round) => {
      const teamAWon = round.scoreTeamA > round.scoreTeamB;
      return [
        ...(teamAWon ? [1, 2] : [3, 4]).map((playerId) => ({
          roundId: round.roundId,
          playerId,
          pointDelta: 1,
        })),
        ...(!teamAWon ? [1, 2] : [3, 4]).map((playerId) => ({
          roundId: round.roundId,
          playerId,
          pointDelta: -1,
        })),
      ];
    });
    const data: BasketballDashboardData = {
      players: [
        { id: 1, displayName: "Alice", familyId: "red" },
        { id: 2, displayName: "Bob", familyId: "blue" },
        { id: 3, displayName: "Cara", familyId: "green" },
        { id: 4, displayName: "Duke", familyId: "yellow" },
      ],
      rounds,
      roundEntries,
    };

    buildBasketballDashboardMetrics({ data, maxRounds: 500 });

    expect(predictMock).toHaveBeenCalled();
    expect(observedPriorLengths[0]).toBe(1);
  });
});
