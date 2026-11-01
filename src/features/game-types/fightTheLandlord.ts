import { z } from "zod";
import type {
  GameTypeDefinition,
  PointEntry,
  RoundCalculationResult,
} from "./types";

const fightTheLandlordSchema = z.object({
  activePlayerIds: z.array(z.string().min(1)).min(3),
  landlordSideSelections: z.array(z.string().min(1)).min(1),
  outcome: z.enum(["won", "lost"]),
  pointBasis: z.int().positive(),
  numBombs: z.int().min(0),
  gameMultiplier: z.int().min(1),
});

export type FightTheLandlordRoundInput = z.infer<
  typeof fightTheLandlordSchema
>;

export function calculateFightTheLandlordRound(
  input: FightTheLandlordRoundInput,
): RoundCalculationResult {
  const parsed = fightTheLandlordSchema.parse(input);

  const { activePlayerIds, landlordSideSelections } = parsed;

  // Build landlord-side membership and selection counts
  const landlordSelectionCounts = new Map<string, number>();
  for (const playerId of landlordSideSelections) {
    landlordSelectionCounts.set(
      playerId,
      (landlordSelectionCounts.get(playerId) ?? 0) + 1,
    );
  }

  const landlordSidePlayers = new Set(landlordSelectionCounts.keys());

  const opposingSide = activePlayerIds.filter(
    (playerId) => !landlordSidePlayers.has(playerId),
  );

  if (opposingSide.length === 0) {
    throw new Error("Fight the Landlord requires at least one opposing player.");
  }

  const landlordPointsBase =
    parsed.pointBasis * parsed.gameMultiplier * (parsed.numBombs + 1);
  const landlordPoints =
    parsed.outcome === "won" ? landlordPointsBase : -landlordPointsBase;

  const totalSelections = landlordSideSelections.length;
  const totalLandlordSidePoints = landlordPoints * totalSelections;

  const entriesByPlayer = new Map<string, number>();
  for (const playerId of activePlayerIds) {
    entriesByPlayer.set(playerId, 0);
  }

  if (parsed.outcome === "won") {
    // Landlord side gains, opposing side loses evenly.
    for (const [playerId, count] of landlordSelectionCounts) {
      const current = entriesByPlayer.get(playerId) ?? 0;
      entriesByPlayer.set(playerId, current + landlordPoints * count);
    }

    const totalWinnerPoints = totalLandlordSidePoints;
    const loserCount = opposingSide.length;
    const lossPerLoser = totalWinnerPoints / loserCount;

    for (const playerId of opposingSide) {
      const current = entriesByPlayer.get(playerId) ?? 0;
      entriesByPlayer.set(playerId, current - lossPerLoser);
    }
  } else {
    // Landlord side loses, opposing side gains evenly.
    for (const [playerId, count] of landlordSelectionCounts) {
      const current = entriesByPlayer.get(playerId) ?? 0;
      entriesByPlayer.set(playerId, current + landlordPoints * count);
    }

    const totalLoss = Math.abs(totalLandlordSidePoints);
    const winnerCount = opposingSide.length;
    const gainPerWinner = totalLoss / winnerCount;

    for (const playerId of opposingSide) {
      const current = entriesByPlayer.get(playerId) ?? 0;
      entriesByPlayer.set(playerId, current + gainPerWinner);
    }
  }

  const entries: PointEntry[] = activePlayerIds.map((playerId) => ({
    playerId,
    pointDelta: entriesByPlayer.get(playerId) ?? 0,
  }));

  const total = entries.reduce((sum, entry) => sum + entry.pointDelta, 0);

  return {
    entries,
    total,
    isZeroSum: Math.abs(total) < 0.01,
    summary: `${parsed.outcome === "won" ? "Landlord side won" : "Landlord side lost"} with ${parsed.numBombs} bombs, ${parsed.gameMultiplier}x game, ${totalSelections} landlord-side selections.`,
  };
}

export const fightTheLandlordGameType: GameTypeDefinition<FightTheLandlordRoundInput> =
  {
    id: "fight-the-landlord",
    name: "Fight the Landlord (SE)",
    icon: "cards",
    calculateRound: calculateFightTheLandlordRound,
  };

// ── See Bottom Card ──────────────────────────────────────────────────
//
// A player pays a flat 3 points to look at the bottom cards; the 3 points are
// split evenly across every other scoring player. It moves points but is not a
// hand of Fight the Landlord, so it never counts as a round win or loss.

export const FTL_SEE_BOTTOM_CARD_COST = 3;

const SEE_BOTTOM_CARD_EPSILON = 0.005;

export type SeeBottomCardInput = {
  /** Scoring (non-ghost) players in the round, in display order. */
  activePlayerIds: number[];
  /** The player who used See Bottom Card. */
  userPlayerId: number;
};

/**
 * Returns one entry per active player: the user pays the cost and everyone
 * else receives an even share. Shares are rounded to cents, with any cent
 * left over from an uneven split given to the first recipients so the round
 * stays exactly zero-sum.
 */
export function calculateSeeBottomCardRound({
  activePlayerIds,
  userPlayerId,
}: SeeBottomCardInput): Array<{ playerId: number; pointDelta: number }> {
  const playerIds = [...new Set(activePlayerIds)];
  if (!playerIds.includes(userPlayerId)) {
    throw new Error("The See Bottom Card player must be in the round.");
  }
  const recipients = playerIds.filter((id) => id !== userPlayerId);
  if (recipients.length === 0) {
    throw new Error("See Bottom Card needs at least one other scoring player.");
  }

  const costCents = FTL_SEE_BOTTOM_CARD_COST * 100;
  const baseShareCents = Math.floor(costCents / recipients.length);
  let leftoverCents = costCents - baseShareCents * recipients.length;
  const shareByPlayer = new Map<number, number>();
  for (const id of recipients) {
    const extra = leftoverCents > 0 ? 1 : 0;
    leftoverCents -= extra;
    shareByPlayer.set(id, (baseShareCents + extra) / 100);
  }

  return playerIds.map((playerId) => ({
    playerId,
    pointDelta:
      playerId === userPlayerId
        ? -FTL_SEE_BOTTOM_CARD_COST
        : (shareByPlayer.get(playerId) ?? 0),
  }));
}

/**
 * Whether a Fight the Landlord round is a See Bottom Card payment rather than
 * a played hand.
 *
 * New rounds carry `metadata.seeBottomCard: true`. Rounds saved before the
 * mechanic existed were entered by hand, so they are recognised by their
 * shape: exactly one player lost points and that player lost exactly 3.
 */
export function isFtlSeeBottomCardRound({
  metadata,
  entries,
}: {
  metadata?: Record<string, unknown> | null;
  entries: Array<{ pointDelta: number }>;
}): boolean {
  if (metadata?.seeBottomCard === true) {
    return true;
  }
  const losers = entries.filter(
    (entry) => entry.pointDelta < -SEE_BOTTOM_CARD_EPSILON,
  );
  const hasWinner = entries.some(
    (entry) => entry.pointDelta > SEE_BOTTOM_CARD_EPSILON,
  );
  return (
    hasWinner &&
    losers.length === 1 &&
    Math.abs(losers[0].pointDelta + FTL_SEE_BOTTOM_CARD_COST) <
      SEE_BOTTOM_CARD_EPSILON
  );
}
