import { describe, expect, it } from "vitest";
import {
  calculateBasketballRound,
  priorBasketballMatchesFromSeasonHistory,
} from "../game-types/basketball";
import { clampToTwoDecimals } from "../game-types/manualPointBalance";
import { mergeCalculatedEntriesWithGhostZeros } from "./playerEligibility";

function mergeBasketballWithGhost(
  priorRounds: Parameters<typeof calculateBasketballRound>[0]["priorRounds"],
  match: Parameters<typeof calculateBasketballRound>[0]["match"],
  ghostPlayerIds: number[],
) {
  const result = calculateBasketballRound({ priorRounds, match });
  const teamA = match.teamAPlayerIds;
  const teamB = match.teamBPlayerIds;
  const teamByPlayerId = new Map<number, "A" | "B">();
  for (const id of teamA) teamByPlayerId.set(id, "A");
  for (const id of teamB) teamByPlayerId.set(id, "B");

  const merged = mergeCalculatedEntriesWithGhostZeros(
    result.entries.map((entry) => ({
      playerId: Number(entry.playerId),
      pointDelta: clampToTwoDecimals(entry.pointDelta),
    })),
    [...teamA, ...teamB],
    new Set(ghostPlayerIds),
    { teamByPlayerId },
  );

  const total = merged.reduce((sum, entry) => sum + entry.pointDelta, 0);
  return { merged, total, result };
}

describe("basketball ghost merge zero-sum", () => {
  const firstMatch = {
    teamAPlayerIds: [1, 99],
    teamBPlayerIds: [2, 3],
    scoreTeamA: 11,
    scoreTeamB: 7,
  };

  it("stays zero-sum on second round with ghost (season-scoped priors)", () => {
    const priorRounds = priorBasketballMatchesFromSeasonHistory([
      { settingsSnapshot: { metadata: { mode: "basketball", ...firstMatch } } },
    ]);
    const { total } = mergeBasketballWithGhost(
      priorRounds,
      { ...firstMatch, scoreTeamA: 11, scoreTeamB: 9 },
      [99],
    );
    expect(Math.abs(total)).toBeLessThanOrEqual(0.01);
    expect(
      mergeBasketballWithGhost([firstMatch], firstMatch, [99]).merged.find(
        (e) => e.playerId === 99,
      )?.pointDelta,
    ).toBe(0);
  });

  it("stays zero-sum across varied scores and rosters with ghosts", () => {
    const priors = [firstMatch];
    const cases: Parameters<typeof calculateBasketballRound>[0]["match"][] = [
      { teamAPlayerIds: [1, 99], teamBPlayerIds: [2, 3], scoreTeamA: 11, scoreTeamB: 9 },
      { teamAPlayerIds: [1, 2], teamBPlayerIds: [99, 3], scoreTeamA: 21, scoreTeamB: 15 },
      { teamAPlayerIds: [1, 99, 4], teamBPlayerIds: [2, 3], scoreTeamA: 11, scoreTeamB: 10 },
      { teamAPlayerIds: [99], teamBPlayerIds: [2, 3], scoreTeamA: 11, scoreTeamB: 8 },
    ];

    for (const match of cases) {
      const { total, merged } = mergeBasketballWithGhost(priors, match, [99]);
      if (Math.abs(total) > 0.01) {
        throw new Error(
          `zero-sum failed: total=${total} entries=${JSON.stringify(merged)}`,
        );
      }
      for (const ghostId of [99]) {
        const ghost = merged.find((e) => e.playerId === ghostId);
        expect(ghost?.pointDelta ?? 0).toBe(0);
      }
    }
  });
});
