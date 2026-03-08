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
  numBombs: z.int().min(0),
  gameMultiplier: z.int().min(1),
  landlordMultiplier: z.int().min(1),
});

export type FightTheLandlordRoundInput = z.infer<
  typeof fightTheLandlordSchema
>;

function distributeEvenly(total: number, playerIds: string[]) {
  const share = total / playerIds.length;
  return playerIds.map((playerId) => ({
    playerId,
    amount: share,
  }));
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

  const basePoints = parsed.pointBasis * parsed.numBombs;
  const landlordPoints =
    basePoints * parsed.gameMultiplier * parsed.landlordMultiplier;
  const friendPoints = basePoints * parsed.gameMultiplier;

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
    parsed.activePlayerIds.indexOf(String(left.playerId)) -
    parsed.activePlayerIds.indexOf(String(right.playerId)),
  );
  const total = entries.reduce((sum, entry) => sum + entry.pointDelta, 0);

  return {
    entries,
    total,
    isZeroSum: Math.abs(total) < 0.01,
    summary: `${parsed.outcome === "won" ? "Landlord side won" : "Landlord side lost"} with ${parsed.numBombs} bombs, ${parsed.gameMultiplier}x game, ${parsed.landlordMultiplier}x landlord.`,
  };
}

export const fightTheLandlordGameType: GameTypeDefinition<FightTheLandlordRoundInput> =
  {
    id: "fight-the-landlord",
    name: "Fight the Landlord (SE)",
    icon: "cards",
    calculateRound: calculateFightTheLandlordRound,
  };
