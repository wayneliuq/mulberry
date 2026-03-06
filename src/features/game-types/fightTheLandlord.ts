import { z } from "zod";
import type {
  GameTypeDefinition,
  PointEntry,
  RoundCalculationResult,
} from "./types";

const fightTheLandlordSchema = z.object({
  activePlayerIds: z.array(z.string().min(1)).min(3),
  landlordId: z.string().min(1),
  landlordFriendIds: z.array(z.string().min(1)),
  outcome: z.enum(["won", "lost"]),
  pointBasis: z.int().positive(),
  bombMultiplier: z.int().min(1).max(10),
  landlordMultiplier: z.int().min(1).max(6),
});

export type FightTheLandlordRoundInput = z.infer<
  typeof fightTheLandlordSchema
>;

function distributeEvenly(total: number, playerIds: string[]) {
  const baseShare = Math.floor(total / playerIds.length);
  let remainder = total % playerIds.length;

  return playerIds.map((playerId) => {
    const adjustment = remainder > 0 ? 1 : 0;
    remainder = Math.max(0, remainder - 1);

    return {
      playerId,
      amount: baseShare + adjustment,
    };
  });
}

export function calculateFightTheLandlordRound(
  input: FightTheLandlordRoundInput,
): RoundCalculationResult {
  const parsed = fightTheLandlordSchema.parse(input);
  const friendIds = Array.from(
    new Set(
      parsed.landlordFriendIds.filter(
        (playerId) => playerId !== parsed.landlordId,
      ),
    ),
  );
  const landlordSide = [parsed.landlordId, ...friendIds];
  const landlordSideSet = new Set(landlordSide);
  const opposingSide = parsed.activePlayerIds.filter(
    (playerId) => !landlordSideSet.has(playerId),
  );

  if (opposingSide.length === 0) {
    throw new Error("Fight the Landlord requires at least one opposing player.");
  }

  const landlordPoints =
    parsed.pointBasis * parsed.bombMultiplier * parsed.landlordMultiplier;
  const friendPoints = parsed.pointBasis * parsed.bombMultiplier;

  const winners = parsed.outcome === "won" ? landlordSide : opposingSide;
  const losers = parsed.outcome === "won" ? opposingSide : landlordSide;

  const winnerEntries: PointEntry[] =
    parsed.outcome === "won"
      ? [
          { playerId: parsed.landlordId, pointDelta: landlordPoints },
          ...friendIds.map((playerId) => ({
              playerId,
              pointDelta: friendPoints,
            })),
        ]
      : distributeEvenly(
          landlordPoints + friendPoints * friendIds.length,
          winners,
        ).map((entry) => ({
          playerId: entry.playerId,
          pointDelta: entry.amount,
        }));

  const totalWinnerPoints = winnerEntries.reduce(
    (sum, entry) => sum + entry.pointDelta,
    0,
  );

  const loserEntries = distributeEvenly(totalWinnerPoints, losers).map(
    (entry) => ({
      playerId: entry.playerId,
      pointDelta: -entry.amount,
    }),
  );

  const entries = [...winnerEntries, ...loserEntries].sort((left, right) =>
    parsed.activePlayerIds.indexOf(left.playerId) -
    parsed.activePlayerIds.indexOf(right.playerId),
  );
  const total = entries.reduce((sum, entry) => sum + entry.pointDelta, 0);

  return {
    entries,
    total,
    isZeroSum: total === 0,
    summary: `${parsed.outcome === "won" ? "Landlord side won" : "Landlord side lost"} with ${parsed.bombMultiplier}x bombs and ${parsed.landlordMultiplier}x landlord multiplier.`,
  };
}

export const fightTheLandlordGameType: GameTypeDefinition<FightTheLandlordRoundInput> =
  {
    id: "fight-the-landlord",
    name: "Fight the Landlord (SE)",
    icon: "cards",
    calculateRound: calculateFightTheLandlordRound,
  };
