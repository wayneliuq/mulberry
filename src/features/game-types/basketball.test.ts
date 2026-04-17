import { describe, expect, it } from "vitest";
import {
  calculateBasketballRound,
  parseBasketballMatchFromRoundSnapshot,
  priorBasketballMatchesFromRoundSnapshots,
} from "./basketball";

describe("calculateBasketballRound", () => {
  it("produces zero-sum entries for a first-round 2v2", () => {
    const result = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 7,
      },
    });

    expect(result.isZeroSum).toBe(true);
    expect(result.entries).toHaveLength(4);
    const byId = new Map(result.entries.map((e) => [e.playerId, e.pointDelta]));
    expect((byId.get(1) ?? 0) + (byId.get(2) ?? 0)).toBeGreaterThan(0);
    expect((byId.get(3) ?? 0) + (byId.get(4) ?? 0)).toBeLessThan(0);
    for (const [, delta] of byId) {
      expect(Math.abs(delta)).toBeGreaterThanOrEqual(10);
      expect(Math.abs(delta)).toBeLessThanOrEqual(20);
    }
  });

  it("uses prior rounds when computing the next update", () => {
    const first = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 0,
      },
    });
    const second = calculateBasketballRound({
      priorRounds: [
        {
          teamAPlayerIds: [1, 2],
          teamBPlayerIds: [3, 4],
          scoreTeamA: 11,
          scoreTeamB: 0,
        },
      ],
      match: {
        teamAPlayerIds: [1, 3],
        teamBPlayerIds: [2, 4],
        scoreTeamA: 11,
        scoreTeamB: 9,
      },
    });

    const first1 = first.entries.find((e) => e.playerId === 1)!.pointDelta;
    const second1 = second.entries.find((e) => e.playerId === 1)!.pointDelta;
    expect(second1).not.toBe(first1);
    expect(second.isZeroSum).toBe(true);
  });

  it("respects an explicit ledgerScale for reproducibility", () => {
    const scaled = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 7,
      },
      ledgerScale: 4,
    });
    const defaultScaled = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 7,
      },
    });
    expect(defaultScaled.entries[0]!.pointDelta).not.toBe(scaled.entries[0]!.pointDelta);
    expect(scaled.isZeroSum).toBe(true);
  });

  it("rejects overlapping rosters", () => {
    expect(() =>
      calculateBasketballRound({
        priorRounds: [],
        match: {
          teamAPlayerIds: [1, 2],
          teamBPlayerIds: [2, 3],
          scoreTeamA: 11,
          scoreTeamB: 7,
        },
      }),
    ).toThrow();
  });
});

describe("parseBasketballMatchFromRoundSnapshot", () => {
  it("reads match fields from settings snapshot metadata", () => {
    const match = parseBasketballMatchFromRoundSnapshot({
      pointBasis: 1,
      moneyPerPointCents: 20,
      metadata: {
        mode: "basketball",
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3],
        scoreTeamA: 11,
        scoreTeamB: 10,
      },
    });
    expect(match).toEqual({
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3],
      scoreTeamA: 11,
      scoreTeamB: 10,
    });
  });

  it("returns null for other game modes", () => {
    expect(
      parseBasketballMatchFromRoundSnapshot({
        metadata: { mode: "werewolves" },
      }),
    ).toBeNull();
  });
});

describe("priorBasketballMatchesFromRoundSnapshots", () => {
  it("orders rounds by round number ascending", () => {
    const prior = priorBasketballMatchesFromRoundSnapshots([
      {
        roundNumber: 2,
        settingsSnapshot: {
          metadata: {
            mode: "basketball",
            teamAPlayerIds: [1],
            teamBPlayerIds: [2],
            scoreTeamA: 11,
            scoreTeamB: 0,
          },
        },
      },
      {
        roundNumber: 1,
        settingsSnapshot: {
          metadata: {
            mode: "basketball",
            teamAPlayerIds: [2],
            teamBPlayerIds: [1],
            scoreTeamA: 11,
            scoreTeamB: 0,
          },
        },
      },
    ]);
    expect(prior).toHaveLength(2);
    expect(prior[0]!.teamAPlayerIds).toEqual([2]);
    expect(prior[1]!.teamAPlayerIds).toEqual([1]);
  });
});
