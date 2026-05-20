/**
 * One-time migration: add four statsPrime axes + GOAT roster swaps.
 * Run: node scripts/migrate-nba-pool-stats-axes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(
  __dirname,
  "..",
  "src/features/dashboards/basketball/nbaComparisonPool.source.json",
);

function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v.toFixed(2))));
}

function deriveStatsAxes(s) {
  const wi = s.winImpact ?? 0.5;
  const op = s.overperformance ?? 0.5;
  const cd = s.clutchDelta ?? 0.5;
  const co = s.consistency ?? 0.5;
  return {
    swingMagnitude: clamp01(0.42 + 0.34 * wi + 0.14 * op + 0.06 * (1 - co)),
    marginSpread: clamp01(0.48 + 0.28 * wi - 0.12 * co + 0.08 * cd),
    chalkReliability: clamp01(0.44 + 0.32 * wi + 0.22 * co + 0.06 * op),
    ledgerAsymmetry: clamp01(0.4 + 0.28 * wi + 0.22 * op - 0.08 * (1 - co)),
  };
}

/** Curator overrides after research (Basketball-Reference, NBA.com, StatMuse). */
const STATS_OVERRIDES = {
  oneal: {
    winImpact: 0.94,
    overperformance: 0.9,
    clutchDelta: 0.78,
    consistency: 0.82,
    swingMagnitude: 0.93,
    marginSpread: 0.9,
    chalkReliability: 0.92,
    ledgerAsymmetry: 0.91,
  },
  kareem: {
    winImpact: 0.95,
    overperformance: 0.88,
    clutchDelta: 0.82,
    consistency: 0.94,
    swingMagnitude: 0.88,
    marginSpread: 0.86,
    chalkReliability: 0.94,
    ledgerAsymmetry: 0.85,
  },
  magic: {
    winImpact: 0.93,
    overperformance: 0.9,
    clutchDelta: 0.88,
    consistency: 0.86,
    swingMagnitude: 0.8,
    marginSpread: 0.84,
    chalkReliability: 0.9,
    ledgerAsymmetry: 0.78,
  },
  michael_jordan: {
    swingMagnitude: 0.9,
    marginSpread: 0.88,
    chalkReliability: 0.94,
    ledgerAsymmetry: 0.86,
  },
  lebron: {
    swingMagnitude: 0.88,
    marginSpread: 0.85,
    chalkReliability: 0.92,
    ledgerAsymmetry: 0.84,
  },
  curry: {
    swingMagnitude: 0.82,
    marginSpread: 0.8,
    chalkReliability: 0.88,
    ledgerAsymmetry: 0.76,
  },
  jokic: {
    swingMagnitude: 0.86,
    marginSpread: 0.82,
    chalkReliability: 0.9,
    ledgerAsymmetry: 0.8,
  },
  duncan: {
    winImpact: 0.94,
    overperformance: 0.86,
    clutchDelta: 0.8,
    consistency: 0.96,
    swingMagnitude: 0.78,
    marginSpread: 0.8,
    chalkReliability: 0.95,
    ledgerAsymmetry: 0.74,
  },
};

const REPLACEMENTS = {
  kyle_kuzma: {
    id: "oneal",
    displayName: "Shaquille O'Neal",
    primeWindow: "1999–00 — 2002–03",
    statsPrime: STATS_OVERRIDES.oneal,
    narrative: {
      carryBias: 0.88,
      upsetFactor: 0.52,
      chemistryBias: 0.72,
      personaIntensity: 0.72,
    },
  },
  nikola_vucevic: {
    id: "kareem",
    displayName: "Kareem Abdul-Jabbar",
    primeWindow: "1976–77 — 1979–80",
    statsPrime: STATS_OVERRIDES.kareem,
    narrative: {
      carryBias: 0.8,
      upsetFactor: 0.5,
      chemistryBias: 0.78,
      personaIntensity: 0.38,
    },
  },
  grayson_allen: {
    id: "magic",
    displayName: "Magic Johnson",
    primeWindow: "1986–87 — 1989–90",
    statsPrime: STATS_OVERRIDES.magic,
    narrative: {
      carryBias: 0.86,
      upsetFactor: 0.54,
      chemistryBias: 0.92,
      personaIntensity: 0.55,
    },
  },
};

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!Array.isArray(raw)) throw new Error("Expected array");

const out = raw.map((entry) => {
  if (REPLACEMENTS[entry.id]) return { ...REPLACEMENTS[entry.id] };

  const stats = { ...entry.statsPrime };
  const derived = deriveStatsAxes(stats);
  for (const k of [
    "swingMagnitude",
    "marginSpread",
    "chalkReliability",
    "ledgerAsymmetry",
  ]) {
    if (stats[k] === undefined) stats[k] = derived[k];
  }
  const ov = STATS_OVERRIDES[entry.id];
  if (ov) Object.assign(stats, ov);

  return { ...entry, statsPrime: stats };
});

if (out.length !== 60) {
  throw new Error(`Expected 60 entries, got ${out.length}`);
}

const ids = new Set(out.map((e) => e.id));
if (ids.size !== 60) throw new Error("Duplicate ids after migration");

fs.writeFileSync(jsonPath, `${JSON.stringify(out, null, 2)}\n`);
console.log("Migrated", out.length, "entries in", jsonPath);
