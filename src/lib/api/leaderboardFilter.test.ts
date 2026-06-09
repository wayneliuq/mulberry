import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_MIN_ROUNDS,
  applyLeaderboardMinRoundsFilter,
} from "./leaderboardFilter";

describe("LEADERBOARD_MIN_ROUNDS", () => {
  it("is set to 10 so a player needs more than 10 rounds to appear", () => {
    expect(LEADERBOARD_MIN_ROUNDS).toBe(10);
  });
});

describe("applyLeaderboardMinRoundsFilter", () => {
  it("keeps players with more than 10 rounds and drops the rest", () => {
    const players = [
      { id: 1, roundsWon: 7, roundsLost: 5 }, // 12 → kept
      { id: 2, roundsWon: 0, roundsLost: 11 }, // 11 → kept
      { id: 3, roundsWon: 5, roundsLost: 5 }, // 10 → dropped
      { id: 4, roundsWon: 1, roundsLost: 0 }, // 1 → dropped
      { id: 5, roundsWon: 0, roundsLost: 0 }, // 0 → dropped
    ];
    expect(applyLeaderboardMinRoundsFilter(players).map((p) => p.id)).toEqual([
      1, 2,
    ]);
  });

  it("does not mutate the input array", () => {
    const players = [
      { id: 1, roundsWon: 5, roundsLost: 5 },
      { id: 2, roundsWon: 6, roundsLost: 6 },
    ];
    const snapshot = players.map((p) => ({ ...p }));
    applyLeaderboardMinRoundsFilter(players);
    expect(players).toEqual(snapshot);
  });

  it("returns an empty array when given an empty array", () => {
    expect(applyLeaderboardMinRoundsFilter([])).toEqual([]);
  });

  it("preserves additional fields on the player shape", () => {
    const players = [
      { id: 1, roundsWon: 6, roundsLost: 6, totalPoints: 42, displayName: "Alpha" },
      { id: 2, roundsWon: 1, roundsLost: 0, totalPoints: 7, displayName: "Bravo" },
    ];
    const result = applyLeaderboardMinRoundsFilter(players);
    expect(result).toEqual([
      { id: 1, roundsWon: 6, roundsLost: 6, totalPoints: 42, displayName: "Alpha" },
    ]);
  });
});
