import { describe, expect, it } from "vitest";
import {
  assignmentsClampedToTeamCount,
  assignmentsFromPartitions,
  basketballMatchupRosters,
  basketballMatchupWithSide,
  basketballPresetPartitions,
  basketballTeamLetters,
  clampBasketballTeamCount,
  DEFAULT_BASKETBALL_MATCHUP,
  normalizeBasketballMatchup,
  rosterForTeamLetter,
  type BasketballTeamChoice,
} from "./basketballTeams";

describe("clampBasketballTeamCount", () => {
  it("keeps 2 through 6 as-is", () => {
    for (const count of [2, 3, 4, 5, 6]) {
      expect(clampBasketballTeamCount(count)).toBe(count);
    }
  });

  it("clamps out-of-range and non-numeric counts into 2–6", () => {
    expect(clampBasketballTeamCount(1)).toBe(2);
    expect(clampBasketballTeamCount(0)).toBe(2);
    expect(clampBasketballTeamCount(-3)).toBe(2);
    expect(clampBasketballTeamCount(7)).toBe(6);
    expect(clampBasketballTeamCount(Number.NaN)).toBe(2);
    expect(clampBasketballTeamCount(3.9)).toBe(3);
  });
});

describe("basketballTeamLetters", () => {
  it("defaults to two letters and grows to six", () => {
    expect(basketballTeamLetters(2)).toEqual(["A", "B"]);
    expect(basketballTeamLetters(3)).toEqual(["A", "B", "C"]);
    expect(basketballTeamLetters(4)).toEqual(["A", "B", "C", "D"]);
    expect(basketballTeamLetters(6)).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("never exceeds six letters", () => {
    expect(basketballTeamLetters(99)).toHaveLength(6);
  });
});

describe("basketballPresetPartitions", () => {
  it("falls back to the two sides when a preset has no teams column", () => {
    expect(
      basketballPresetPartitions({
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
      }),
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("ignores a null or single-entry teams column", () => {
    expect(
      basketballPresetPartitions({
        teamAPlayerIds: [1],
        teamBPlayerIds: [2],
        teams: null,
      }),
    ).toEqual([[1], [2]]);
    expect(
      basketballPresetPartitions({
        teamAPlayerIds: [1],
        teamBPlayerIds: [2],
        teams: [[1, 2]],
      }),
    ).toEqual([[1], [2]]);
  });

  it("returns every partition of a multi-team preset", () => {
    expect(
      basketballPresetPartitions({
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        teams: [
          [1, 2],
          [3, 4],
          [5, 6],
          [7, 8],
        ],
      }),
    ).toHaveLength(4);
  });
});

describe("assignmentsFromPartitions", () => {
  it("assigns two partitions to A and B", () => {
    expect(
      assignmentsFromPartitions(
        [
          [1, 3],
          [2, 4],
        ],
        [1, 2, 3, 4],
      ),
    ).toEqual({ 1: "A", 2: "B", 3: "A", 4: "B" });
  });

  it("assigns six partitions across A–F", () => {
    const assignments = assignmentsFromPartitions(
      [[1], [2], [3], [4], [5], [6]],
      [1, 2, 3, 4, 5, 6],
    );
    expect(assignments).toEqual({
      1: "A",
      2: "B",
      3: "C",
      4: "D",
      5: "E",
      6: "F",
    });
  });

  it("marks eligible players missing from the partitions as none", () => {
    expect(assignmentsFromPartitions([[1], [2]], [1, 2, 3])[3]).toBe("none");
  });

  it("drops ids that are no longer on the unlocked roster", () => {
    expect(assignmentsFromPartitions([[1, 99], [2]], [1, 2])).toEqual({
      1: "A",
      2: "B",
    });
  });
});

describe("assignmentsClampedToTeamCount", () => {
  it("leaves assignments alone when every team is still in play", () => {
    const assignments: Record<number, BasketballTeamChoice> = {
      1: "A",
      2: "B",
      3: "C",
    };
    expect(assignmentsClampedToTeamCount(assignments, 3)).toEqual(assignments);
  });

  it("releases players stranded on teams that no longer exist", () => {
    expect(
      assignmentsClampedToTeamCount(
        { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F" },
        3,
      ),
    ).toEqual({ 1: "A", 2: "B", 3: "C", 4: "none", 5: "none", 6: "none" });
  });
});

describe("normalizeBasketballMatchup", () => {
  it("leaves a valid matchup untouched", () => {
    expect(normalizeBasketballMatchup({ home: "C", away: "A" }, 4)).toEqual({
      home: "C",
      away: "A",
    });
  });

  it("pulls letters back into range when the team count shrinks", () => {
    expect(normalizeBasketballMatchup({ home: "E", away: "F" }, 2)).toEqual(
      DEFAULT_BASKETBALL_MATCHUP,
    );
    expect(normalizeBasketballMatchup({ home: "B", away: "F" }, 3)).toEqual({
      home: "B",
      away: "A",
    });
  });

  it("never points both sides at the same team", () => {
    expect(normalizeBasketballMatchup({ home: "C", away: "C" }, 4)).toEqual({
      home: "C",
      away: "A",
    });
  });
});

describe("basketballMatchupWithSide", () => {
  it("changes one side", () => {
    expect(
      basketballMatchupWithSide(DEFAULT_BASKETBALL_MATCHUP, "away", "D", 4),
    ).toEqual({ home: "A", away: "D" });
  });

  it("swaps sides instead of colliding when picking the other team", () => {
    expect(
      basketballMatchupWithSide({ home: "A", away: "C" }, "home", "C", 4),
    ).toEqual({ home: "C", away: "A" });
    expect(
      basketballMatchupWithSide({ home: "A", away: "C" }, "away", "A", 4),
    ).toEqual({ home: "C", away: "A" });
  });
});

describe("basketballMatchupRosters", () => {
  const playerIds = [1, 2, 3, 4, 5, 6];
  const assignments: Record<number, BasketballTeamChoice> = {
    1: "A",
    2: "A",
    3: "B",
    4: "B",
    5: "C",
    6: "none",
  };

  it("defaults to A vs B with nobody sidelined in a two-team lineup", () => {
    const rosters = basketballMatchupRosters(
      [1, 2, 3, 4],
      assignments,
      DEFAULT_BASKETBALL_MATCHUP,
    );
    expect(rosters).toEqual({
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3, 4],
      sidelinedPlayerIds: [],
    });
  });

  it("scores the chosen matchup and sidelines the other teams", () => {
    expect(
      basketballMatchupRosters(playerIds, assignments, {
        home: "C",
        away: "B",
      }),
    ).toEqual({
      teamAPlayerIds: [5],
      teamBPlayerIds: [3, 4],
      sidelinedPlayerIds: [1, 2],
    });
  });

  it("does not count unassigned players as sidelined", () => {
    const { sidelinedPlayerIds } = basketballMatchupRosters(
      playerIds,
      assignments,
      { home: "A", away: "B" },
    );
    expect(sidelinedPlayerIds).toEqual([5]);
  });

  it("preserves the order the players were given in", () => {
    expect(
      rosterForTeamLetter([4, 3, 2, 1], assignments, "A"),
    ).toEqual([2, 1]);
  });
});
