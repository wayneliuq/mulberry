import { z } from "zod";
import type {
  GameTypeDefinition,
  PointEntry,
  RoundCalculationResult,
} from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const dixitEntrySchema = z.object({
  playerId: z.union([z.string().min(1), z.number().int().positive()]),
  pointDelta: z.number(),
  joinOrder: z.number().int(),
});

const dixitRoundSchema = z
  .object({
    entries: z.array(dixitEntrySchema).min(2),
  })
  .superRefine((data, ctx) => {
    const ids = data.entries.map((e) => String(e.playerId));
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate player in Dixit round.",
      });
    }
  });

export type DixitRoundInput = z.infer<typeof dixitRoundSchema>;

export function calculateDixitRound(
  input: DixitRoundInput,
): RoundCalculationResult {
  const parsed = dixitRoundSchema.parse(input);
  const ordered = [...parsed.entries].sort((a, b) => a.joinOrder - b.joinOrder);
  const n = ordered.length;
  const rawClamped = ordered.map((e) => ({
    playerId: e.playerId,
    joinOrder: e.joinOrder,
    pointDelta: round2(e.pointDelta),
  }));

  const rawValues = rawClamped.map((e) => e.pointDelta);
  const maxRaw = Math.max(...rawValues);
  const minRaw = Math.min(...rawValues);
  const correctionFactor = (maxRaw - minRaw) / 10;

  const S = rawClamped.reduce((sum, e) => sum + e.pointDelta, 0);
  const adjustment = S / n;

  const exactDeltas = rawClamped.map((e) => e.pointDelta - adjustment);
  const rounded = exactDeltas.map((d) => round2(d));
  const sumRounded = round2(rounded.reduce((sum, d) => sum + d, 0));
  const fix = round2(-sumRounded);

  const adjusted = rounded.map((d, i) =>
    i === 0 ? round2(d + fix) : d,
  );

  const scaledRounded = adjusted.map((d) => round2(d * correctionFactor));
  const sumScaled = round2(scaledRounded.reduce((sum, d) => sum + d, 0));
  const fixScaled = round2(-sumScaled);
  const finalDeltas = scaledRounded.map((d, i) =>
    i === 0 ? round2(d + fixScaled) : d,
  );

  const total = round2(finalDeltas.reduce((sum, d) => sum + d, 0));

  const entries: PointEntry[] = rawClamped.map((e, i) => ({
    playerId: e.playerId,
    pointDelta: finalDeltas[i]!,
  }));

  return {
    entries,
    total,
    isZeroSum: Math.abs(total) < 0.0001,
    summary: entries
      .map(
        (entry) =>
          `${entry.playerId} ${entry.pointDelta > 0 ? "+" : ""}${entry.pointDelta}`,
      )
      .join(", "),
  };
}

export const dixitGameType: GameTypeDefinition<DixitRoundInput> = {
  id: "dixit",
  name: "Dixit",
  icon: "meeple",
  calculateRound: calculateDixitRound,
};
