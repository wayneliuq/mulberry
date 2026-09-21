import { describe, expect, it } from "vitest";
import {
  buildBasketballScoredRoundEntries,
} from "../game-types/basketballRoundDraft";
import { calculateBasketballRound } from "../game-types/basketball";

function draftWithGhost(
  match: Parameters<typeof calculateBasketballRound>[0]["match"],
  ghostPlayerIds: number[],
  priorRounds: Parameters<typeof calculateBasketballRound>[0]["priorRounds"] = [],
) {
  const priorHistory = priorRounds.map((m) => ({
    settingsSnapshot: {
      metadata: {
        mode: "basketball",
        teamAPlayerIds: m.teamAPlayerIds,
        teamBPlayerIds: m.teamBPlayerIds,
        scoreTeamA: m.scoreTeamA,
        scoreTeamB: m.scoreTeamB,
      },
    },
  }));
  return buildBasketballScoredRoundEntries({
    seasonHistory: priorHistory,
    teamAPlayerIds: match.teamAPlayerIds,
    teamBPlayerIds: match.teamBPlayerIds,
    scoreTeamA: match.scoreTeamA,
    scoreTeamB: match.scoreTeamB,
    ghostPlayerIds: new Set(ghostPlayerIds),
  });
}

describe("basketball ghost entries go to the house", () => {
  const firstMatch = {
    teamAPlayerIds: [1, 99],
    teamBPlayerIds: [2, 3],
    scoreTeamA: 11,
    scoreTeamB: 7,
  };

  it("zeroes the ghost and absorbs its share in the house, keeping players + house balanced", () => {
    const draft = draftWithGhost(firstMatch, [99], [firstMatch]);
    expect(draft).not.toBeNull();

    const ghost = draft!.entries.find((e) => e.playerId === 99);
    expect(ghost?.pointDelta).toBe(0);

    const playerTotal = draft!.entries.reduce((s, e) => s + e.pointDelta, 0);
    expect(playerTotal + draft!.houseDelta).toBeCloseTo(0, 10);
  });

  it("leaves real players' deltas identical to the no-ghost calculation", () => {
    const withGhost = draftWithGhost(firstMatch, [99])!;
    const raw = calculateBasketballRound({ priorRounds: [], match: firstMatch });

    for (const entry of withGhost.entries) {
      if (entry.playerId === 99) continue;
      const expected = raw.entries.find(
        (e) => Number(e.playerId) === entry.playerId,
      )!.pointDelta;
      expect(entry.pointDelta).toBe(expected);
    }

    // House = -(players) = raw house + ghost's raw share.
    const ghostRaw = raw.entries.find((e) => Number(e.playerId) === 99)!.pointDelta;
    expect(withGhost.houseDelta).toBeCloseTo(raw.houseDelta + ghostRaw, 10);
  });

  it("stays balanced across varied scores and rosters with ghosts", () => {
    const priors = [firstMatch];
    const cases: Parameters<typeof calculateBasketballRound>[0]["match"][] = [
      { teamAPlayerIds: [1, 99], teamBPlayerIds: [2, 3], scoreTeamA: 11, scoreTeamB: 9 },
      { teamAPlayerIds: [1, 2], teamBPlayerIds: [99, 3], scoreTeamA: 21, scoreTeamB: 15 },
      { teamAPlayerIds: [1, 99, 4], teamBPlayerIds: [2, 3], scoreTeamA: 11, scoreTeamB: 10 },
      { teamAPlayerIds: [99], teamBPlayerIds: [2, 3], scoreTeamA: 11, scoreTeamB: 8 },
    ];

    for (const match of cases) {
      const draft = draftWithGhost(match, [99], priors)!;
      const playerTotal = draft.entries.reduce((s, e) => s + e.pointDelta, 0);
      if (Math.abs(playerTotal + draft.houseDelta) > 1e-9) {
        throw new Error(
          `balance failed: total=${playerTotal} house=${draft.houseDelta}`,
        );
      }
      expect(
        draft.entries.find((e) => e.playerId === 99)?.pointDelta,
      ).toBe(0);
    }
  });
});
