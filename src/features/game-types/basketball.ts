import { ordinal, predictWin, rate, rating } from "openskill";
import { z } from "zod";
import type { GameTypeDefinition, PointEntry } from "./types";

/**
 * Fixed ledger multiplier applied to raw OpenSkill ordinal movement.
 * One constant for every round: cumulative player totals are exactly
 * LEDGER_SCALE x final OpenSkill ordinal, so the points leaderboard ranking
 * always matches the true OpenSkill ranking. Score and margin do not affect
 * points (OpenSkill only reads win/loss/tie from the score).
 *
 * Each round also records a balancing "house" line
 * (houseDelta = -sum(player deltas)) in the round metadata, because OpenSkill
 * updates are not zero-sum across the participants.
 */
export const DEFAULT_BASKETBALL_LEDGER_SCALE = 7;

/** Max unlocked players considered for auto team balance (combinatorial cap). */
export const BASKETBALL_TEAM_BALANCE_MAX_PLAYERS = 12;

export type BalancedBasketballTeams = {
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  teamAWinProb: number;
  teams?: number[][];
};

/**
 * Display-only formatting for a ledger line: signed, rounded to 2dp.
 * Stored and computed values always keep full precision.
 */
export function formatSignedPoints(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

const matchSchema = z
  .object({
    teamAPlayerIds: z.array(z.number().int().positive()).min(1),
    teamBPlayerIds: z.array(z.number().int().positive()).min(1),
    scoreTeamA: z.number().int().min(0),
    scoreTeamB: z.number().int().min(0),
  })
  .superRefine((data, ctx) => {
    const setA = new Set(data.teamAPlayerIds);
    if (new Set(data.teamAPlayerIds).size !== data.teamAPlayerIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Team A cannot list the same player twice.",
      });
    }
    if (new Set(data.teamBPlayerIds).size !== data.teamBPlayerIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Team B cannot list the same player twice.",
      });
    }
    for (const id of data.teamBPlayerIds) {
      if (setA.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: "A player cannot appear on both teams.",
        });
      }
    }
  });

/**
 * Validation contract for a single basketball matchup. Exported so callers that
 * must *fail soft* (return null) rather than throw — e.g.
 * `buildBasketballScoredRoundEntries`, which is called from a React `useMemo`
 * and from the recalculation script — can `safeParse` the same rules
 * `calculateBasketballRound` enforces instead of re-implementing a subset.
 */
export const basketballMatchSchema = matchSchema;

export const basketballRoundSchema = z.object({
  priorRounds: z.array(matchSchema),
  match: matchSchema,
  /**
   * Optional per-round override for reproducibility when reading history.
   * New rounds should omit this so the current `DEFAULT_BASKETBALL_LEDGER_SCALE` applies.
   */
  ledgerScale: z.number().finite().positive().optional(),
  /**
   * Scoring system used for the game:
   * - "1/2": 1s and 2s scoring (default; games to 7, 11, 15)
   * - "2/3": 2s and 3s scoring (games to 21; pure point scale halved)
   */
  scoringSystem: z.enum(["1/2", "2/3"]).optional(),
});

export type BasketballMatchInput = z.infer<typeof matchSchema>;
export type BasketballRoundInput = z.infer<typeof basketballRoundSchema>;

type OpenSkillRating = { mu: number; sigma: number };

function applyMatchToRatings(
  ratings: Map<number, OpenSkillRating>,
  match: BasketballMatchInput,
): void {
  const teamA = match.teamAPlayerIds.map(
    (id) => ratings.get(id) ?? rating(),
  );
  const teamB = match.teamBPlayerIds.map(
    (id) => ratings.get(id) ?? rating(),
  );
  const [ratedA, ratedB] = rate([teamA, teamB], {
    score: [match.scoreTeamA, match.scoreTeamB],
  });
  match.teamAPlayerIds.forEach((id, i) => {
    ratings.set(id, ratedA[i]!);
  });
  match.teamBPlayerIds.forEach((id, i) => {
    ratings.set(id, ratedB[i]!);
  });
}

function ordinalFor(
  ratings: Map<number, OpenSkillRating>,
  playerId: number,
): number {
  return ordinal(ratings.get(playerId) ?? rating());
}

export function parseBasketballMatchFromRoundSnapshot(
  settingsSnapshot: Record<string, unknown> | undefined,
): BasketballMatchInput | null {
  if (!settingsSnapshot) {
    return null;
  }
  const meta = settingsSnapshot.metadata as Record<string, unknown> | undefined;
  if (!meta || meta.mode !== "basketball") {
    return null;
  }
  const parsed = matchSchema.safeParse({
    teamAPlayerIds: meta.teamAPlayerIds,
    teamBPlayerIds: meta.teamBPlayerIds,
    scoreTeamA: meta.scoreTeamA,
    scoreTeamB: meta.scoreTeamB,
  });
  return parsed.success ? parsed.data : null;
}

export function parseBasketballScoringSystemFromRoundSnapshot(
  settingsSnapshot: Record<string, unknown> | undefined,
): "1/2" | "2/3" {
  const meta = settingsSnapshot?.metadata as Record<string, unknown> | undefined;
  return meta?.scoringSystem === "2/3" ? "2/3" : "1/2";
}

export function priorBasketballMatchesFromRoundSnapshots(
  rounds: Array<{
    roundNumber: number;
    settingsSnapshot?: Record<string, unknown>;
  }>,
): BasketballMatchInput[] {
  return [...rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => parseBasketballMatchFromRoundSnapshot(round.settingsSnapshot))
    .filter((m): m is BasketballMatchInput => m !== null);
}

/**
 * Prior matches from season history rows already ordered chronologically
 * (e.g. `fetchBasketballRoundHistory` by `created_at`). Used for new-round scoring
 * and aligned with win-probability replay in the game view.
 */
export function priorBasketballMatchesFromSeasonHistory(
  rounds: Array<{ settingsSnapshot?: Record<string, unknown> }>,
): BasketballMatchInput[] {
  return rounds
    .map((round) => parseBasketballMatchFromRoundSnapshot(round.settingsSnapshot))
    .filter((m): m is BasketballMatchInput => m !== null);
}

/**
 * Basketball rounds strictly before `beforeRoundNumber`, parsed and ordered for replay.
 */
export function priorBasketballMatchesStrictlyBeforeRound(
  rounds: Array<{
    roundNumber: number;
    settingsSnapshot?: Record<string, unknown>;
  }>,
  beforeRoundNumber: number,
): BasketballMatchInput[] {
  return priorBasketballMatchesFromRoundSnapshots(
    rounds.filter((r) => r.roundNumber < beforeRoundNumber),
  );
}

function replayPriorsIntoRatings(
  priorRoundsChronological: BasketballMatchInput[],
): Map<number, OpenSkillRating> {
  const ratings = new Map<number, OpenSkillRating>();
  for (const prior of priorRoundsChronological) {
    applyMatchToRatings(ratings, prior);
  }
  return ratings;
}

/**
 * OpenSkill ordinals (`mu - 3 * sigma`) for every player appearing in
 * `priorRoundsChronological`, after replaying them in order.
 *
 * This is the ranking the points ledger is meant to reproduce: for a player who
 * only ever appears in automatic rounds, cumulative points telescope to exactly
 * `LEDGER_SCALE * (finalOrdinal - ordinal(rating()))`, so points order and
 * ordinal order must agree. Audits compare the two.
 */
export function basketballOrdinalsAfterRounds(
  priorRoundsChronological: BasketballMatchInput[],
): Map<number, number> {
  const ratings = replayPriorsIntoRatings(priorRoundsChronological);
  return new Map(
    [...ratings.entries()].map(([playerId, r]) => [playerId, ordinal(r)]),
  );
}

/** Ordinal of a never-rated player — the baseline every ledger total starts from. */
export function baselineBasketballOrdinal(): number {
  return ordinal(rating());
}

/**
 * Pre-match win probabilities for Team A vs Team B using OpenSkill `predictWin`,
 * after replaying `priorRoundsChronological` in order (same priors as scoring).
 */
export function predictBasketballMatchWinProbabilities(
  priorRoundsChronological: BasketballMatchInput[],
  match: BasketballMatchInput,
): { teamAWinProb: number; teamBWinProb: number } | null {
  const parsedMatch = matchSchema.safeParse(match);
  if (!parsedMatch.success) {
    return null;
  }
  const ratings = replayPriorsIntoRatings(priorRoundsChronological);
  const teamA = parsedMatch.data.teamAPlayerIds.map(
    (id) => ratings.get(id) ?? rating(),
  );
  const teamB = parsedMatch.data.teamBPlayerIds.map(
    (id) => ratings.get(id) ?? rating(),
  );
  const probs = predictWin([teamA, teamB]);
  const teamAWinProb = probs[0];
  const teamBWinProb = probs[1];
  if (
    typeof teamAWinProb !== "number" ||
    typeof teamBWinProb !== "number" ||
    !Number.isFinite(teamAWinProb) ||
    !Number.isFinite(teamBWinProb)
  ) {
    return null;
  }
  return { teamAWinProb, teamBWinProb };
}

function winProbForTeams(
  ratings: Map<number, OpenSkillRating>,
  teamAPlayerIds: number[],
  teamBPlayerIds: number[],
): number | null {
  const teamA = teamAPlayerIds.map((id) => ratings.get(id) ?? rating());
  const teamB = teamBPlayerIds.map((id) => ratings.get(id) ?? rating());
  const probs = predictWin([teamA, teamB]);
  const teamAWinProb = probs[0];
  if (typeof teamAWinProb !== "number" || !Number.isFinite(teamAWinProb)) {
    return null;
  }
  return teamAWinProb;
}

function partitionScore(
  teamAPlayerIds: number[],
  teamBPlayerIds: number[],
  ratings: Map<number, OpenSkillRating>,
): { distanceFromHalf: number; teamAWinProb: number } | null {
  const teamAWinProb = winProbForTeams(ratings, teamAPlayerIds, teamBPlayerIds);
  if (teamAWinProb === null) {
    return null;
  }
  return {
    distanceFromHalf: Math.abs(teamAWinProb - 0.5),
    teamAWinProb,
  };
}

/**
 * Orders two *equally sized* candidate splits. Size balance is not a term here
 * on purpose: candidates are filtered to even sizes before they are scored (see
 * `balanceBasketballTeams`), so by the time two partitions are compared they
 * already have identical size profiles and only skill and determinism are left
 * to decide between them.
 */
function comparePartitions(
  left: {
    teamAPlayerIds: number[];
    teamBPlayerIds: number[];
    distanceFromHalf: number;
    teamAWinProb: number;
  },
  right: {
    teamAPlayerIds: number[];
    teamBPlayerIds: number[];
    distanceFromHalf: number;
    teamAWinProb: number;
  },
): number {
  if (left.distanceFromHalf !== right.distanceFromHalf) {
    return left.distanceFromHalf - right.distanceFromHalf;
  }

  const leftKey = [...left.teamAPlayerIds].sort((a, b) => a - b).join(",");
  const rightKey = [...right.teamAPlayerIds].sort((a, b) => a - b).join(",");
  return leftKey.localeCompare(rightKey);
}

/**
 * Partition unlocked players into numTeams (2 to 6) teams.
 *
 * Two objectives, in strict priority order — they can conflict, and when they
 * do the count always wins:
 *
 *   1. **Even player counts (hard constraint).** Team sizes differ by at most
 *      one: `floor(N / K)` or `ceil(N / K)` players each. 8 players over 2
 *      teams is 4v4, never 3v5; 8 over 3 teams is 3/3/2. This is not a
 *      tiebreaker — unevenly sized splits are never considered at all, however
 *      much better their skill balance would look.
 *   2. **Skill balance (best effort).** *Within* the evenly sized candidates,
 *      pick the one whose sides are closest in OpenSkill terms — win
 *      probability nearest 50/50 for two teams, minimum variance of team mean
 *      ordinals for three or more. A lopsided roster can still leave the
 *      stronger side favoured; that is accepted, the size rule is not.
 */
export function balanceBasketballTeams(
  playerIds: number[],
  priorRoundsChronological: BasketballMatchInput[],
  numTeams: number = 2,
): BalancedBasketballTeams | null {
  const sortedIds = [...new Set(playerIds)].sort((a, b) => a - b);
  if (sortedIds.length < numTeams || numTeams < 2 || numTeams > 6) {
    return null;
  }
  if (sortedIds.length > BASKETBALL_TEAM_BALANCE_MAX_PLAYERS) {
    return null;
  }

  const ratings = replayPriorsIntoRatings(priorRoundsChronological);

  if (numTeams === 2) {
    const n = sortedIds.length;
    const maxMask = (1 << n) - 1;
    // Hard size constraint: only splits whose sides differ by at most one
    // player are candidates. 8 players means 4v4 — a 3v5 that happens to land
    // closer to 50/50 is discarded before it is ever scored.
    const minTeamSize = Math.floor(n / 2);
    const maxTeamSize = Math.ceil(n / 2);
    let best: {
      teamAPlayerIds: number[];
      teamBPlayerIds: number[];
      distanceFromHalf: number;
      teamAWinProb: number;
    } | null = null;

    for (let mask = 1; mask < maxMask; mask += 1) {
      const teamAPlayerIds: number[] = [];
      const teamBPlayerIds: number[] = [];
      for (let i = 0; i < n; i += 1) {
        if (mask & (1 << i)) {
          teamAPlayerIds.push(sortedIds[i]!);
        } else {
          teamBPlayerIds.push(sortedIds[i]!);
        }
      }

      if (
        teamAPlayerIds.length < minTeamSize ||
        teamAPlayerIds.length > maxTeamSize
      ) {
        continue;
      }

      const scored = partitionScore(teamAPlayerIds, teamBPlayerIds, ratings);
      if (!scored) {
        continue;
      }

      const candidate = {
        teamAPlayerIds,
        teamBPlayerIds,
        distanceFromHalf: scored.distanceFromHalf,
        teamAWinProb: scored.teamAWinProb,
      };

      if (!best || comparePartitions(candidate, best) < 0) {
        best = candidate;
      }
    }

    if (!best) {
      return null;
    }

    return {
      teamAPlayerIds: best.teamAPlayerIds,
      teamBPlayerIds: best.teamBPlayerIds,
      teamAWinProb: best.teamAWinProb,
      teams: [best.teamAPlayerIds, best.teamBPlayerIds],
    };
  }

  // Multi-team balancing (K = 3..6): partition N players into K teams whose
  // sizes differ by at most one, minimising the variance of the teams' mean
  // OpenSkill ordinals. Win probability is a two-sided measure, so it cannot
  // stand in for "balanced" once there are more than two teams.
  //
  // The size bounds below are enforced by construction rather than scored: a
  // team never grows past `maxTeamSize`, and `slackAfter` prunes any branch
  // that can no longer bring every team up to `minTeamSize`. Skill variance
  // only ever chooses among splits that already satisfy the size rule.
  const K = numTeams;
  const N = sortedIds.length;
  const minTeamSize = Math.floor(N / K);
  const maxTeamSize = Math.ceil(N / K);

  const playerOrdinals = sortedIds.map((id) => ordinalFor(ratings, id));

  let bestTeams: number[][] | null = null;
  let bestVariance = Infinity;
  let bestKey = "";

  const currentAssignment: number[] = new Array(N).fill(-1);
  const teamSizes: number[] = new Array(K).fill(0);
  const teamOrdinalSums: number[] = new Array(K).fill(0);

  /**
   * Players still to place, minus the ones already spoken for by teams that
   * have not reached `minTeamSize` (counting untouched teams as needing a full
   * `minTeamSize`). Negative means this branch can no longer fill every team.
   */
  function slackAfter(playerIdx: number, teamsUsedCount: number): number {
    let needed = minTeamSize * (K - teamsUsedCount);
    for (let t = 0; t < teamsUsedCount; t += 1) {
      const short = minTeamSize - teamSizes[t]!;
      if (short > 0) {
        needed += short;
      }
    }
    return N - playerIdx - needed;
  }

  function search(playerIdx: number, teamsUsedCount: number) {
    if (slackAfter(playerIdx, teamsUsedCount) < 0) {
      return;
    }

    if (playerIdx === N) {
      const teamLists: number[][] = Array.from({ length: K }, () => []);
      for (let i = 0; i < N; i += 1) {
        teamLists[currentAssignment[i]!]!.push(sortedIds[i]!);
      }

      let meanOfMeans = 0;
      const teamMeans: number[] = new Array(K);
      for (let t = 0; t < K; t += 1) {
        const mean = teamOrdinalSums[t]! / teamSizes[t]!;
        teamMeans[t] = mean;
        meanOfMeans += mean;
      }
      meanOfMeans /= K;

      let variance = 0;
      for (let t = 0; t < K; t += 1) {
        variance += (teamMeans[t]! - meanOfMeans) ** 2;
      }
      variance /= K;

      // Ties are common with fresh (identically rated) players, so break them
      // on a stable roster key rather than on traversal order.
      const key = teamLists.map((team) => team.join(",")).join("|");
      if (
        variance < bestVariance - 1e-12 ||
        (variance < bestVariance + 1e-12 && (!bestTeams || key < bestKey))
      ) {
        bestVariance = Math.min(variance, bestVariance);
        bestTeams = teamLists;
        bestKey = key;
      }
      return;
    }

    // Canonical labelling: a player may only open the next unused team, which
    // keeps each partition from being re-explored under every permutation of
    // team letters.
    const maxTeamToTry = Math.min(teamsUsedCount, K - 1);
    const ordinalValue = playerOrdinals[playerIdx]!;
    for (let t = 0; t <= maxTeamToTry; t += 1) {
      if (teamSizes[t]! >= maxTeamSize) {
        continue;
      }
      currentAssignment[playerIdx] = t;
      teamSizes[t]! += 1;
      teamOrdinalSums[t]! += ordinalValue;
      search(
        playerIdx + 1,
        t === teamsUsedCount ? teamsUsedCount + 1 : teamsUsedCount,
      );
      teamSizes[t]! -= 1;
      teamOrdinalSums[t]! -= ordinalValue;
    }
    currentAssignment[playerIdx] = -1;
  }

  search(0, 0);

  if (!bestTeams) {
    return null;
  }

  const teamA = bestTeams[0] ?? [];
  const teamB = bestTeams[1] ?? [];
  const teamAWinProb = winProbForTeams(ratings, teamA, teamB) ?? 0.5;

  return {
    teamAPlayerIds: teamA,
    teamBPlayerIds: teamB,
    teamAWinProb,
    teams: bestTeams,
  };
}

export type BasketballRoundCalculationResult = {
  entries: PointEntry[];
  /**
   * Ledger-balancing line for the round: always -sum(entries). Stored in the
   * round's metadata (not as a player entry) so the books balance every round
   * while player totals stay exactly LEDGER_SCALE x OpenSkill ordinal.
   */
  houseDelta: number;
  /**
   * Sum of the player entries. Unlike other game types this is deliberately
   * NOT zero — it is exactly `-houseDelta`, the drift the house absorbs.
   */
  total: number;
  /** Whether the round ledger (players + house) balances. */
  isZeroSum: boolean;
  summary: string;
};

export function calculateBasketballRound(
  input: BasketballRoundInput,
): BasketballRoundCalculationResult {
  const parsed = basketballRoundSchema.parse(input);
  const ledgerScale = parsed.ledgerScale ?? DEFAULT_BASKETBALL_LEDGER_SCALE;

  const ratings = replayPriorsIntoRatings(parsed.priorRounds);

  const participantIds = [
    ...parsed.match.teamAPlayerIds,
    ...parsed.match.teamBPlayerIds,
  ];
  const beforeOrd = new Map<number, number>();
  for (const id of participantIds) {
    beforeOrd.set(id, ordinalFor(ratings, id));
  }

  applyMatchToRatings(ratings, parsed.match);

  // Full precision: rounding here would let cent-level dust flip near-ties,
  // breaking the exact match with the OpenSkill ranking. Display code rounds.
  // Entry order stays team A then team B so the summary reads by side.
  const entries: PointEntry[] = participantIds.map((playerId) => ({
    playerId,
    pointDelta:
      (ordinalFor(ratings, playerId) - (beforeOrd.get(playerId) ?? 0)) *
      ledgerScale,
  }));

  const total = entries.reduce((sum, e) => sum + e.pointDelta, 0);
  const houseDelta = -total;

  const summary = `Team A ${parsed.match.scoreTeamA}–${parsed.match.scoreTeamB} Team B · ${entries
    .map((e) => `${e.playerId} ${formatSignedPoints(e.pointDelta)}`)
    .join(", ")} · House ${formatSignedPoints(houseDelta)}`;

  return {
    entries,
    houseDelta,
    total,
    isZeroSum: Math.abs(total + houseDelta) <= 0.01,
    summary,
  };
}

export const basketballGameType: GameTypeDefinition<BasketballRoundInput> = {
  id: "basketball",
  name: "Basketball",
  icon: "basketball",
  calculateRound: calculateBasketballRound,
};
