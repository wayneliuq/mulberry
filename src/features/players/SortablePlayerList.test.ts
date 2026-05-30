import { describe, expect, it } from "vitest";
import {
  computeRoundCountsFromGameRounds,
  sortPlayers,
} from "./SortablePlayerList";

describe("computeRoundCountsFromGameRounds", () => {
  it("counts distinct rounds per player in a game", () => {
    const counts = computeRoundCountsFromGameRounds([
      {
        entries: [
          { playerId: 1 },
          { playerId: 2 },
        ],
      },
      {
        entries: [
          { playerId: 1 },
          { playerId: 3 },
        ],
      },
      {
        entries: [{ playerId: 2 }, { playerId: 2 }],
      },
    ]);

    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(2);
    expect(counts.get(3)).toBe(1);
  });
});

describe("sortPlayers rounds-desc", () => {
  it("sorts by rounds played descending with player id tiebreaker", () => {
    const players = [
      { id: 3, displayName: "Charlie", roundsPlayed: 0 },
      { id: 1, displayName: "Alpha", roundsPlayed: 5 },
      { id: 2, displayName: "Bravo", roundsPlayed: 5 },
      { id: 4, displayName: "Delta", roundsPlayed: 2 },
    ];

    expect(sortPlayers(players, "rounds-desc").map((player) => player.id)).toEqual([
      1, 2, 4, 3,
    ]);
  });
});
