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
