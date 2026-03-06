import { z } from "zod";
import type {
  GameTypeDefinition,
  PointEntry,
  RoundCalculationResult,
} from "./types";

const texasHoldemEntrySchema = z.object({
  playerId: z.union([z.string().min(1), z.number().int().positive()]),
  pointDelta: z.int(),
});

const texasHoldemRoundSchema = z.object({
  entries: z.array(texasHoldemEntrySchema).min(2),
});

export type TexasHoldemRoundInput = z.infer<typeof texasHoldemRoundSchema>;

export function calculateTexasHoldemRound(
  input: TexasHoldemRoundInput,
): RoundCalculationResult {
  const parsed = texasHoldemRoundSchema.parse(input);
  const entries: PointEntry[] = parsed.entries.map((entry) => ({
    playerId: entry.playerId,
    pointDelta: entry.pointDelta,
  }));
  const total = entries.reduce((sum, entry) => sum + entry.pointDelta, 0);

  return {
    entries,
    total,
    isZeroSum: total === 0,
    summary: entries
      .map((entry) =>
        `${entry.playerId} ${entry.pointDelta > 0 ? "+" : ""}${entry.pointDelta}`,
      )
      .join(", "),
  };
}

export const texasHoldemGameType: GameTypeDefinition<TexasHoldemRoundInput> = {
  id: "texas-holdem",
  name: "Texas Hold'em",
  icon: "cards",
  calculateRound: calculateTexasHoldemRound,
};
