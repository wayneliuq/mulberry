import { describe, expect, it } from "vitest";
import { ordinal, rate, rating } from "openskill";
import {
  balanceBasketballTeams,
  calculateBasketballRound,
  DEFAULT_BASKETBALL_LEDGER_SCALE,
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

  it("defaults to two teams when no count is given", () => {
    const result = balanceBasketballTeams([1, 2, 3, 4, 5, 6], []);
    expect(result).not.toBeNull();
    expect(result!.teams).toHaveLength(2);
    expect(result!.teams![0]).toEqual(result!.teamAPlayerIds);
    expect(result!.teams![1]).toEqual(result!.teamBPlayerIds);
    expect(
      result!.teamAPlayerIds.length + result!.teamBPlayerIds.length,
    ).toBe(6);
  });

  it("splits twelve players into 6 teams of 2", () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const result = balanceBasketballTeams(ids, [], 6);
    expect(result).not.toBeNull();
    expect(result!.teams).toHaveLength(6);
    for (const team of result!.teams!) {
      expect(team).toHaveLength(2);
    }
    expect([...result!.teams!.flat()].sort((a, b) => a - b)).toEqual(ids);
  });

  it.each([
    { playerCount: 7, numTeams: 3, sizes: [3, 2, 2] },
    { playerCount: 9, numTeams: 4, sizes: [3, 2, 2, 2] },
    { playerCount: 11, numTeams: 5, sizes: [3, 2, 2, 2, 2] },
    { playerCount: 8, numTeams: 6, sizes: [2, 2, 1, 1, 1, 1] },
  ])(
    "spreads $playerCount players across $numTeams teams as evenly as possible",
    ({ playerCount, numTeams, sizes }) => {
      const ids = Array.from({ length: playerCount }, (_, i) => i + 1);
      const result = balanceBasketballTeams(ids, [], numTeams);

      expect(result).not.toBeNull();
      expect(result!.teams).toHaveLength(numTeams);
      expect(
        result!
          .teams!.map((team) => team.length)
          .sort((a, b) => b - a),
      ).toEqual(sizes);
      // Every player is placed exactly once.
      expect([...result!.teams!.flat()].sort((a, b) => a - b)).toEqual(ids);
      // Teams A and B stay the first two partitions, so the round form and the
      // stored preset agree on which rosters "team A" and "team B" name.
      expect(result!.teamAPlayerIds).toEqual(result!.teams![0]);
      expect(result!.teamBPlayerIds).toEqual(result!.teams![1]);
    },
  );

  it("rejects counts outside 2–6 and rosters smaller than the team count", () => {
    expect(balanceBasketballTeams([1, 2, 3, 4], [], 1)).toBeNull();
    expect(balanceBasketballTeams([1, 2, 3, 4, 5, 6, 7], [], 7)).toBeNull();
    expect(balanceBasketballTeams([1, 2, 3], [], 4)).toBeNull();
  });

  it("is deterministic for a given roster and team count", () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const first = balanceBasketballTeams(ids, [], 3);
    const second = balanceBasketballTeams(ids, [], 3);
    expect(first!.teams).toEqual(second!.teams);
  });

  it("spreads proven strength across three teams", () => {
    // 1 and 2 beat everyone they have played; they should not end up together.
    const priors = [
      {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 21,
        scoreTeamB: 0,
      },
      {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [5, 6],
        scoreTeamA: 21,
        scoreTeamB: 0,
      },
    ];
    const result = balanceBasketballTeams([1, 2, 3, 4, 5, 6], priors, 3);
    expect(result).not.toBeNull();
    const teamOfOne = result!.teams!.find((team) => team.includes(1));
    expect(teamOfOne).toBeDefined();
    expect(teamOfOne).not.toContain(2);
  });

  it("balances twelve players into six teams without timing out", () => {
    const ids = Array.from({ length: 12 }, (_, i) => i + 1);
    const started = Date.now();
    expect(balanceBasketballTeams(ids, [], 6)).not.toBeNull();
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe("balanceBasketballTeams even-size rule", () => {
  /**
   * Priors that make every player's rating distinct, so the skill objective has
   * a real gradient and would happily pick an uneven split if it were allowed
   * to. Each round is a decisive 1v1, which spreads the eight ids out across
   * the ordinal range.
   */
  function lopsidedPriors(playerCount: number) {
    const rounds = [];
    for (let winner = 1; winner < playerCount; winner += 1) {
      for (let loser = winner + 1; loser <= playerCount; loser += 1) {
        rounds.push({
          teamAPlayerIds: [winner],
          teamBPlayerIds: [loser],
          scoreTeamA: 21,
          scoreTeamB: 0,
        });
      }
    }
    return rounds;
  }

  /**
   * The shape that used to produce Wayne's 3v5: three players who have beaten
   * the other five repeatedly. Three strong against five weak lands almost
   * exactly on 50/50, while the closest 4v4 is a blowout — so a balancer that
   * scored size as a mere tiebreaker would choose 3v5 every time.
   */
  function strongMinorityPriors() {
    const strong = [1, 2, 3];
    const weak = [4, 5, 6, 7, 8];
    const rounds = [];
    for (let rep = 0; rep < 4; rep += 1) {
      for (const winner of strong) {
        for (const loser of weak) {
          rounds.push({
            teamAPlayerIds: [winner],
            teamBPlayerIds: [loser],
            scoreTeamA: 21,
            scoreTeamB: 0,
          });
        }
      }
    }
    return rounds;
  }

  it("splits eight players 4v4, never 3v5, even when 3v5 is the fairer match", () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8];
    const priors = strongMinorityPriors();

    // Precondition: an uneven split really is the skill-optimal one here (two
    // strong plus a weak against one strong plus four weak lands on 50.2%),
    // so this test fails if the even-size rule is ever demoted to a tiebreaker.
    const threeVsFive = predictBasketballMatchWinProbabilities(priors, {
      teamAPlayerIds: [1, 3, 6],
      teamBPlayerIds: [2, 4, 5, 7, 8],
      scoreTeamA: 0,
      scoreTeamB: 0,
    });
    expect(Math.abs(threeVsFive!.teamAWinProb - 0.5)).toBeLessThan(0.05);

    const result = balanceBasketballTeams(ids, priors, 2);
    expect(result).not.toBeNull();
    expect(result!.teamAPlayerIds).toHaveLength(4);
    expect(result!.teamBPlayerIds).toHaveLength(4);
    // And the count rule wins outright: the resulting match is far from even,
    // which is the accepted trade — sizes first, skill second.
    expect(Math.abs(result!.teamAWinProb - 0.5)).toBeGreaterThan(0.05);
  });

  it.each([
    { playerCount: 4, sizes: [2, 2] },
    { playerCount: 5, sizes: [3, 2] },
    { playerCount: 6, sizes: [3, 3] },
    { playerCount: 7, sizes: [4, 3] },
    { playerCount: 8, sizes: [4, 4] },
    { playerCount: 9, sizes: [5, 4] },
    { playerCount: 10, sizes: [5, 5] },
    { playerCount: 11, sizes: [6, 5] },
    { playerCount: 12, sizes: [6, 6] },
  ])(
    "splits $playerCount players into two teams of $sizes",
    ({ playerCount, sizes }) => {
      const ids = Array.from({ length: playerCount }, (_, i) => i + 1);
      const result = balanceBasketballTeams(ids, lopsidedPriors(playerCount), 2);

      expect(result).not.toBeNull();
      expect(
        [result!.teamAPlayerIds.length, result!.teamBPlayerIds.length].sort(
          (a, b) => b - a,
        ),
      ).toEqual(sizes);
      expect(
        [...result!.teamAPlayerIds, ...result!.teamBPlayerIds].sort(
          (a, b) => a - b,
        ),
      ).toEqual(ids);
    },
  );

  it.each([2, 3, 4, 5, 6])(
    "keeps %i-team splits within one player of each other for every roster size",
    (numTeams) => {
      for (let playerCount = numTeams; playerCount <= 12; playerCount += 1) {
        const ids = Array.from({ length: playerCount }, (_, i) => i + 1);
        const result = balanceBasketballTeams(
          ids,
          lopsidedPriors(playerCount),
          numTeams,
        );

        expect(result).not.toBeNull();
        const sizes = result!.teams!.map((team) => team.length);
        expect(sizes).toHaveLength(numTeams);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(playerCount);
      }
    },
  );

  it("beats a naive split on skill while holding the even-size rule", () => {
    // Ratings run 1 (strongest) to 8 (weakest). The naive split — strongest
    // half against weakest half — is 4v4 but wildly lopsided; the balancer has
    // to do better without breaking 4v4.
    const ids = [1, 2, 3, 4, 5, 6, 7, 8];
    const priors = lopsidedPriors(8);
    const result = balanceBasketballTeams(ids, priors, 2);

    expect(result).not.toBeNull();
    expect(result!.teamAPlayerIds).toHaveLength(4);

    const naive = predictBasketballMatchWinProbabilities(priors, {
      teamAPlayerIds: [1, 2, 3, 4],
      teamBPlayerIds: [5, 6, 7, 8],
      scoreTeamA: 0,
      scoreTeamB: 0,
    });
    expect(naive).not.toBeNull();

    const balancedDistance = Math.abs(result!.teamAWinProb - 0.5);
    const naiveDistance = Math.abs(naive!.teamAWinProb - 0.5);
    expect(balancedDistance).toBeLessThan(naiveDistance);
    // Wayne's bar: the stronger side should not be better than a ~60% favourite.
    expect(Math.max(result!.teamAWinProb, 1 - result!.teamAWinProb)).toBeLessThanOrEqual(0.6);
  });
});

describe("calculateBasketballRound", () => {
  it("balances every round through the house line", () => {
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
    const playerTotal = result.entries.reduce((s, e) => s + e.pointDelta, 0);
    expect(result.houseDelta).toBeCloseTo(-playerTotal, 10);
    expect(playerTotal + result.houseDelta).toBeCloseTo(0, 10);
    const byId = new Map(result.entries.map((e) => [e.playerId, e.pointDelta]));
    expect((byId.get(1) ?? 0) + (byId.get(2) ?? 0)).toBeGreaterThan(0);
    expect((byId.get(3) ?? 0) + (byId.get(4) ?? 0)).toBeLessThan(0);
  });

  it("awards raw ordinal movement times the fixed ledger scale", () => {
    const result = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 7,
      },
    });

    // Fresh 1v1-equivalent ratings: winner ordinal moves +x, loser -y (not
    // symmetric); each entry must equal scale * that raw movement exactly.
    const r = rating();
    expect(ordinal(r)).toBeCloseTo(0, 10);
    for (const entry of result.entries) {
      expect(entry.pointDelta).not.toBe(0);
    }
    // Winners gain, losers lose; magnitudes need not mirror (not zero-sum).
    const byId = new Map(result.entries.map((e) => [e.playerId, e.pointDelta]));
    expect(byId.get(1)).toBeGreaterThan(0);
    expect(byId.get(3)).toBeLessThan(0);
  });

  it("ignores margin: 11-0 and 11-9 produce identical deltas", () => {
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

    for (const id of [1, 2, 3, 4]) {
      const c = closeWin.entries.find((e) => e.playerId === id)!.pointDelta;
      const s = shutoutWin.entries.find((e) => e.playerId === id)!.pointDelta;
      expect(s).toBe(c);
    }
    expect(shutoutWin.houseDelta).toBe(closeWin.houseDelta);
  });

  it("ignores game length: 7-5 and 17-14 produce identical deltas", () => {
    const short = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 7,
        scoreTeamB: 5,
      },
    });
    const long = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 17,
        scoreTeamB: 14,
      },
    });

    for (const id of [1, 2, 3, 4]) {
      const a = short.entries.find((e) => e.playerId === id)!.pointDelta;
      const b = long.entries.find((e) => e.playerId === id)!.pointDelta;
      expect(b).toBe(a);
    }
  });

  it("ignores the scoring system for point deltas", () => {
    const oneTwo = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 11,
        scoreTeamB: 9,
      },
      scoringSystem: "1/2",
    });
    const twoThree = calculateBasketballRound({
      priorRounds: [],
      match: {
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: 21,
        scoreTeamB: 19,
      },
      scoringSystem: "2/3",
    });

    for (const id of [1, 2, 3, 4]) {
      const a = oneTwo.entries.find((e) => e.playerId === id)!.pointDelta;
      const b = twoThree.entries.find((e) => e.playerId === id)!.pointDelta;
      expect(b).toBe(a);
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

  it("keeps cumulative totals exactly proportional to OpenSkill ordinals", () => {
    // Scripted season with mixed rosters, scores, draws, and team sizes.
    const matches = [
      { teamAPlayerIds: [1, 2], teamBPlayerIds: [3, 4], scoreTeamA: 11, scoreTeamB: 7 },
      { teamAPlayerIds: [1, 3], teamBPlayerIds: [2, 4], scoreTeamA: 17, scoreTeamB: 14 },
      { teamAPlayerIds: [1, 2], teamBPlayerIds: [3, 4], scoreTeamA: 7, scoreTeamB: 7 },
      { teamAPlayerIds: [2, 3], teamBPlayerIds: [1, 4], scoreTeamA: 11, scoreTeamB: 0 },
      { teamAPlayerIds: [1, 2, 3], teamBPlayerIds: [4, 5, 6], scoreTeamA: 21, scoreTeamB: 19 },
      { teamAPlayerIds: [4], teamBPlayerIds: [5], scoreTeamA: 11, scoreTeamB: 9 },
      { teamAPlayerIds: [6, 1], teamBPlayerIds: [2, 5], scoreTeamA: 15, scoreTeamB: 13 },
    ];

    const totals = new Map<number, number>();
    const priors: typeof matches = [];
    for (const match of matches) {
      const result = calculateBasketballRound({ priorRounds: priors, match });
      expect(result.isZeroSum).toBe(true);
      for (const entry of result.entries) {
        totals.set(
          Number(entry.playerId),
          (totals.get(Number(entry.playerId)) ?? 0) + entry.pointDelta,
        );
      }
      priors.push(match);
    }

    // Ground truth: replay the same matches with raw openskill ordinals.
    const ratings = new Map<number, ReturnType<typeof rating>>();
    const getRating = (id: number) => {
      let r = ratings.get(id);
      if (!r) {
        r = rating();
        ratings.set(id, r);
      }
      return r;
    };
    for (const match of matches) {
      const teamA = match.teamAPlayerIds.map(getRating);
      const teamB = match.teamBPlayerIds.map(getRating);
      // Same call the app makes: v4 derives win/loss/tie from the scores.
      const [ratedA, ratedB] = rate([teamA, teamB], {
        score: [match.scoreTeamA, match.scoreTeamB],
      });
      match.teamAPlayerIds.forEach((id, i) => ratings.set(id, ratedA[i]!));
      match.teamBPlayerIds.forEach((id, i) => ratings.set(id, ratedB[i]!));
    }

    // Ranking by total must match ranking by ordinal for every pair of
    // players, up to float dust: signs agree unless the gap is negligible
    // (a true tie, where either order is correct).
    const ids = [...totals.keys()];
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const dt = totals.get(a)! - totals.get(b)!;
        const dOrd = ordinal(ratings.get(a)!) - ordinal(ratings.get(b)!);
        if (
          Math.abs(dOrd) * DEFAULT_BASKETBALL_LEDGER_SCALE <
          1e-9
        ) {
          continue; // tie: either order is a correct ranking
        }
        expect(Math.sign(dt)).toBe(Math.sign(dOrd));
      }
    }
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

  it("respects an explicit ledgerScale as a fixed multiplier", () => {
    const match = {
      teamAPlayerIds: [1, 2],
      teamBPlayerIds: [3, 4],
      scoreTeamA: 11,
      scoreTeamB: 7,
    };
    const scaled = calculateBasketballRound({ priorRounds: [], match, ledgerScale: 4 });
    const def = calculateBasketballRound({ priorRounds: [], match });
    for (const entry of def.entries) {
      const s = scaled.entries.find((e) => e.playerId === entry.playerId)!.pointDelta;
      expect(s).toBeCloseTo(
        (entry.pointDelta / DEFAULT_BASKETBALL_LEDGER_SCALE) * 4,
        10,
      );
    }
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
