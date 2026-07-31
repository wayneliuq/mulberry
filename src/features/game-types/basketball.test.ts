import { describe, expect, it } from "vitest";
import {
  balanceBasketballTeams,
  basketballEffectiveLedgerScale,
  calculateBasketballRound,
  parseBasketballMatchFromRoundSnapshot,
  parseBasketballScoringSystemFromRoundSnapshot,
  predictBasketballMatchWinProbabilities,
  priorBasketballMatchesFromRoundSnapshots,
  priorBasketballMatchesFromSeasonHistory,
  priorBasketballMatchesStrictlyBeforeRound,
} from "./basketball";

describe("balanceBasketballTeams", () => {
  it("returns null when fewer than two players", () => {
    expect(balanceBasketballTeams([], [])).toBeNull();
    expect(balanceBasketballTeams([1], [])).toBeNull();
  });

  it("splits four fresh players into 2v2 near 50/50", () => {
    const result = balanceBasketballTeams([1, 2, 3, 4], []);
    expect(result).not.toBeNull();
    expect(result!.teamAPlayerIds).toHaveLength(2);
    expect(result!.teamBPlayerIds).toHaveLength(2);
    expect(result!.teamAWinProb).toBeGreaterThanOrEqual(0.45);
    expect(result!.teamAWinProb).toBeLessThanOrEqual(0.55);
  });

  it("separates stronger players across teams after a decisive prior", () => {
    const priors = [
      {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 21,
        scoreTeamB: 0,
      },
    ];
    const result = balanceBasketballTeams([1, 2, 3, 4], priors);
    expect(result).not.toBeNull();
    const teamA = new Set(result!.teamAPlayerIds);
    const teamB = new Set(result!.teamBPlayerIds);
    const winnersTogether =
      (teamA.has(1) && teamA.has(2)) || (teamB.has(1) && teamB.has(2));
    expect(winnersTogether).toBe(false);
  });

  it("handles three players with uneven teams", () => {
    const result = balanceBasketballTeams([1, 2, 3], []);
    expect(result).not.toBeNull();
    expect(result!.teamAPlayerIds.length + result!.teamBPlayerIds.length).toBe(3);
    expect(result!.teamAPlayerIds.length).toBeGreaterThanOrEqual(1);
    expect(result!.teamBPlayerIds.length).toBeGreaterThanOrEqual(1);
  });

  it("splits six players into 3 balanced teams of 2 players each", () => {
    const result = balanceBasketballTeams([1, 2, 3, 4, 5, 6], [], 3);
    expect(result).not.toBeNull();
    expect(result!.teams).toHaveLength(3);
    for (const team of result!.teams!) {
      expect(team).toHaveLength(2);
    }
  });

  it("splits eight players into 4 balanced teams of 2 players each", () => {
    const result = balanceBasketballTeams([1, 2, 3, 4, 5, 6, 7, 8], [], 4);
    expect(result).not.toBeNull();
    expect(result!.teams).toHaveLength(4);
    for (const team of result!.teams!) {
      expect(team).toHaveLength(2);
    }
  });
});

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

  it("scales 11–0 shutout win at exactly 2.0x fold change compared to 11–9 close win", () => {
    const closeWin = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 9,
      },
    });
    const shutoutWin = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 0,
      },
    });

    const closeDelta = closeWin.entries.find((e) => e.playerId === 1)!.pointDelta;
    const shutoutDelta = shutoutWin.entries.find((e) => e.playerId === 1)!.pointDelta;
    expect(shutoutDelta / closeDelta).toBeCloseTo(2.0, 1);
  });

  it("scales 7 vs 11 vs 15 point games proportionally", () => {
    const game7 = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 7,
        scoreTeamB: 5,
      },
    });
    const game11 = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 9,
      },
    });
    const game15 = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 15,
        scoreTeamB: 13,
      },
    });

    const delta7 = game7.entries.find((e) => e.playerId === 1)!.pointDelta;
    const delta11 = game11.entries.find((e) => e.playerId === 1)!.pointDelta;
    const delta15 = game15.entries.find((e) => e.playerId === 1)!.pointDelta;

    expect(delta7 / delta11).toBeCloseTo(7 / 11, 1);
    expect(delta15 / delta11).toBeCloseTo(15 / 11, 1);
  });

  it("halves effective point scale when 2s & 3s mode is selected", () => {
    const game11_1s2s = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 9,
      },
      scoringSystem: "1/2",
    });
    const game21_2s3s = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 21,
        scoreTeamB: 19,
      },
      scoringSystem: "2/3",
    });

    const delta11 = game11_1s2s.entries.find((e) => e.playerId === 1)!.pointDelta;
    const delta21 = game21_2s3s.entries.find((e) => e.playerId === 1)!.pointDelta;
    // 21 in 2s/3s mode is 10.5 effective pts vs 11 in 1s/2s mode -> nearly identical (~0.955 ratio)
    expect(delta21 / delta11).toBeCloseTo(10.5 / 11, 1);
  });

  it("computes exact effective ledger scale for length and capped margin", () => {
    expect(
      basketballEffectiveLedgerScale({
        scoreTeamA: 11,
        scoreTeamB: 9,
      }),
    ).toBeCloseTo(7 * (11 / 11) * 1.0, 10);

    expect(
      basketballEffectiveLedgerScale({
        scoreTeamA: 7,
        scoreTeamB: 5,
      }),
    ).toBeCloseTo(7 * (7 / 11) * 1.0, 10);

    expect(
      basketballEffectiveLedgerScale({
        scoreTeamA: 15,
        scoreTeamB: 13,
      }),
    ).toBeCloseTo(7 * (15 / 11) * 1.0, 10);

    expect(
      basketballEffectiveLedgerScale({
        scoreTeamA: 11,
        scoreTeamB: 0,
      }),
    ).toBeCloseTo(7 * 1.0 * 2.0, 10);

    expect(
      basketballEffectiveLedgerScale({
        scoreTeamA: 21,
        scoreTeamB: 19,
        scoringSystem: "2/3",
      }),
    ).toBeCloseTo(7 * (10.5 / 11) * 1.0, 10);

    // Cap stays at 2.0x even for absurd margins after 2/3 halving.
    expect(
      basketballEffectiveLedgerScale({
        scoreTeamA: 40,
        scoreTeamB: 0,
        scoringSystem: "2/3",
      }),
    ).toBeCloseTo(7 * (20 / 11) * 2.0, 10);
  });

  it("defaults historical snapshots without scoringSystem to 1/2", () => {
    expect(
      parseBasketballScoringSystemFromRoundSnapshot({
        metadata: {
          mode: "basketball",
          teamAPlayerIds: [1],
          teamBPlayerIds: [2],
          scoreTeamA: 11,
          scoreTeamB: 9,
        },
      }),
    ).toBe("1/2");
    expect(
      parseBasketballScoringSystemFromRoundSnapshot({
        metadata: {
          mode: "basketball",
          scoringSystem: "2/3",
          teamAPlayerIds: [1],
          teamBPlayerIds: [2],
          scoreTeamA: 21,
          scoreTeamB: 19,
        },
      }),
    ).toBe("2/3");
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

describe("priorBasketballMatchesFromSeasonHistory", () => {
  it("preserves caller order and skips non-scored rounds", () => {
    const meta = (teamA: number[], teamB: number[]) => ({
      metadata: {
        mode: "basketball" as const,
        teamAPlayerIds: teamA,
        teamBPlayerIds: teamB,
        scoreTeamA: 11,
        scoreTeamB: 0,
      },
    });
    const prior = priorBasketballMatchesFromSeasonHistory([
      { settingsSnapshot: meta([1], [2]) },
      { settingsSnapshot: { metadata: { mode: "basketball", manualInput: true } } },
      { settingsSnapshot: meta([2], [3]) },
    ]);
    expect(prior).toHaveLength(2);
    expect(prior[0]!.teamAPlayerIds).toEqual([1]);
    expect(prior[1]!.teamAPlayerIds).toEqual([2]);
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

describe("priorBasketballMatchesStrictlyBeforeRound", () => {
  it("includes only rounds with smaller round numbers", () => {
    const meta = (teamA: number[], teamB: number[]) => ({
      mode: "basketball" as const,
      teamAPlayerIds: teamA,
      teamBPlayerIds: teamB,
      scoreTeamA: 11,
      scoreTeamB: 0,
    });
    const rounds = [
      { roundNumber: 1, settingsSnapshot: { metadata: meta([1], [2]) } },
      { roundNumber: 2, settingsSnapshot: { metadata: meta([1], [2]) } },
      { roundNumber: 3, settingsSnapshot: { metadata: meta([1], [2]) } },
    ];
    const prior = priorBasketballMatchesStrictlyBeforeRound(rounds, 3);
    expect(prior).toHaveLength(2);
    expect(prior[0]!.teamAPlayerIds).toEqual([1]);
    expect(prior[1]!.teamAPlayerIds).toEqual([1]);
  });
});

describe("predictBasketballMatchWinProbabilities", () => {
  const symmetricMatch = {
    teamAPlayerIds: [1, 2],
    teamBPlayerIds: [3, 4],
    scoreTeamA: 11,
    scoreTeamB: 7,
  };

  it("returns probabilities in [0, 1] that sum to ~1", () => {
    const p = predictBasketballMatchWinProbabilities([], symmetricMatch);
    expect(p).not.toBeNull();
    expect(p!.teamAWinProb).toBeGreaterThanOrEqual(0);
    expect(p!.teamAWinProb).toBeLessThanOrEqual(1);
    expect(p!.teamBWinProb).toBeGreaterThanOrEqual(0);
    expect(p!.teamBWinProb).toBeLessThanOrEqual(1);
    expect(p!.teamAWinProb + p!.teamBWinProb).toBeCloseTo(1, 5);
  });

  it("changes when priors include a decisive prior round", () => {
    const noPrior = predictBasketballMatchWinProbabilities([], symmetricMatch);
    const withPrior = predictBasketballMatchWinProbabilities(
      [
        {
          teamAPlayerIds: [1, 2],
          teamBPlayerIds: [3, 4],
          scoreTeamA: 21,
          scoreTeamB: 0,
        },
      ],
      symmetricMatch,
    );
    expect(noPrior!.teamAWinProb).not.toBeCloseTo(withPrior!.teamAWinProb, 2);
  });

  it("returns null for invalid match input", () => {
    expect(
      predictBasketballMatchWinProbabilities(
        [],
        {
          teamAPlayerIds: [],
          teamBPlayerIds: [1],
          scoreTeamA: 0,
          scoreTeamB: 0,
        },
      ),
    ).toBeNull();
  });
});
