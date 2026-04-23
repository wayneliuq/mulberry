import { ordinal, predictWin, rate, rating } from "openskill";
import { z } from "zod";
import type {
  GameTypeDefinition,
  PointEntry,
  RoundCalculationResult,
} from "./types";

/**
 * Scales OpenSkill ordinal movement into Mulberry-sized point swings.
 * Tuned so a fresh 2v2 game to ~11 with a few points margin lands near
 * ~10–15 |delta| per player after zero-sum centering (see unit tests).
 */
export const DEFAULT_BASKETBALL_LEDGER_SCALE = 7;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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

export const basketballRoundSchema = z.object({
  priorRounds: z.array(matchSchema),
  match: matchSchema,
  /**
   * Optional per-round override for reproducibility when reading history.
   * New rounds should omit this so the current `DEFAULT_BASKETBALL_LEDGER_SCALE` applies.
   */
  ledgerScale: z.number().finite().positive().optional(),
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

export function calculateBasketballRound(
  input: BasketballRoundInput,
): RoundCalculationResult {
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

  const rawDeltas = participantIds.map((id) => {
    const after = ordinalFor(ratings, id);
    const before = beforeOrd.get(id) ?? 0;
    return round2((after - before) * ledgerScale);
  });

  const n = rawDeltas.length;
  const meanAdj = n > 0 ? round2(rawDeltas.reduce((s, d) => s + d, 0) / n) : 0;
  const centered = rawDeltas.map((d) => round2(d - meanAdj));
  const sumCentered = round2(centered.reduce((s, d) => s + d, 0));
  const fix = round2(-sumCentered);
  const finalDeltas = centered.map((d, i) =>
    i === 0 ? round2(d + fix) : d,
  );

  const entries: PointEntry[] = participantIds.map((playerId, i) => ({
    playerId,
    pointDelta: finalDeltas[i]!,
  }));

  const total = round2(finalDeltas.reduce((s, d) => s + d, 0));

  const summary = `Team A ${parsed.match.scoreTeamA}–${parsed.match.scoreTeamB} Team B · ${entries
    .map(
      (e) =>
        `${e.playerId} ${e.pointDelta > 0 ? "+" : ""}${e.pointDelta}`,
    )
    .join(", ")}`;

  return {
    entries,
    total,
    isZeroSum: Math.abs(total) < 0.0001,
    summary,
  };
}

export const basketballGameType: GameTypeDefinition<BasketballRoundInput> = {
  id: "basketball",
  name: "Basketball",
  icon: "basketball",
  calculateRound: calculateBasketballRound,
};
