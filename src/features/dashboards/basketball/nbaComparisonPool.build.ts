import type { ComparisonVector, NbaComparisonPlayer } from "./nbaComparisonVector";
import poolSourceJson from "./nbaComparisonPool.source.json";

export type NbaPoolSourceEntry = {
  id: string;
  displayName: string;
  /** Human-readable prime window backing the stats-half priors (curator text). */
  primeWindow: string;
  statsPrime: {
    winImpact: number;
    overperformance: number;
    clutchDelta: number;
    consistency: number;
  };
  narrative: {
    carryBias: number;
    upsetFactor: number;
    chemistryBias: number;
    personaIntensity: number;
  };
};

const STATS_DIMS = [
  "winImpact",
  "overperformance",
  "clutchDelta",
  "consistency",
] as const satisfies readonly (keyof NbaPoolSourceEntry["statsPrime"])[];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * For each index i, returns the average-rank percentile of values[i] within `values`
 * (0 = lowest in pool, 1 = highest). Ties share the mean rank.
 */
function averageRankPercentiles(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [0.5];
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => (a.v !== b.v ? a.v - b.v : a.i - b.i));
  const out = new Array<number>(n);
  let j = 0;
  while (j < n) {
    let k = j + 1;
    while (k < n && indexed[k].v === indexed[j].v) k += 1;
    const lo = j;
    const hi = k - 1;
    const avgRank = (lo + hi) / 2;
    const pct = avgRank / (n - 1);
    for (let t = j; t < k; t += 1) out[indexed[t].i] = pct;
    j = k;
  }
  return out;
}

function mergeEntry(
  entry: NbaPoolSourceEntry,
  statsPct: Record<(typeof STATS_DIMS)[number], number>,
): ComparisonVector {
  const n = entry.narrative;
  return {
    winImpact: statsPct.winImpact,
    overperformance: statsPct.overperformance,
    clutchDelta: statsPct.clutchDelta,
    consistency: statsPct.consistency,
    carryBias: clamp01(n.carryBias),
    upsetFactor: clamp01(n.upsetFactor),
    chemistryBias: clamp01(n.chemistryBias),
    personaIntensity: clamp01(n.personaIntensity),
  };
}

/**
 * Builds runtime pool vectors: **stats half** (`winImpact`, `overperformance`,
 * `clutchDelta`, `consistency`) is each pro’s curator `statsPrime` score re-mapped to
 * average-rank percentiles **within the pool** so those four axes use the full [0, 1]
 * spread. **Narrative half** is taken directly from `narrative` (still [0, 1] priors).
 */
export function buildNbaComparisonPlayerPool(
  source: readonly NbaPoolSourceEntry[],
): NbaComparisonPlayer[] {
  const n = source.length;
  if (n === 0) return [];

  const byDim: Record<(typeof STATS_DIMS)[number], number[]> = {
    winImpact: source.map((e) => e.statsPrime.winImpact),
    overperformance: source.map((e) => e.statsPrime.overperformance),
    clutchDelta: source.map((e) => e.statsPrime.clutchDelta),
    consistency: source.map((e) => e.statsPrime.consistency),
  };

  const pctByDim: Record<(typeof STATS_DIMS)[number], number[]> = {
    winImpact: averageRankPercentiles(byDim.winImpact),
    overperformance: averageRankPercentiles(byDim.overperformance),
    clutchDelta: averageRankPercentiles(byDim.clutchDelta),
    consistency: averageRankPercentiles(byDim.consistency),
  };

  return source.map((entry, i) => ({
    id: entry.id,
    displayName: entry.displayName,
    vector: mergeEntry(entry, {
      winImpact: pctByDim.winImpact[i]!,
      overperformance: pctByDim.overperformance[i]!,
      clutchDelta: pctByDim.clutchDelta[i]!,
      consistency: pctByDim.consistency[i]!,
    }),
  }));
}

export const NBA_COMPARISON_PLAYER_POOL: NbaComparisonPlayer[] =
  buildNbaComparisonPlayerPool(poolSourceJson as NbaPoolSourceEntry[]);
