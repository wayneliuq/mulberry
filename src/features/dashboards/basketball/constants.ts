import type { DashboardMetricMeta } from "./types";

export const DASHBOARD_MAX_ROUNDS = 500;

export const PLAYER_MIN_ROUNDS = 20;
export const PAIR_MIN_TOGETHER = 8;
export const PAIR_MIN_APART = 8;
export const CLUTCH_MARGIN = 2;
export const CLUTCH_MIN_ROUNDS = 8;
export const RIVALRY_MIN_MATCHES = 10;
export const RIVALRY_VOLUME_REFERENCE = 20;
export const CARRY_MIN_SIDE_SAMPLES = 8;
export const UPSET_PROBABILITY_THRESHOLD = 0.4;
export const UPSET_MIN_OPPORTUNITIES = 6;
export const TRIO_MIN_TOGETHER = 6;
export const FAMILY_PAIR_MIN_TOGETHER = 6;
export const BALANCED_MIN_TEAMMATES = 6;

export const TOP_N = {
  combos: 5,
  clutch: 5,
  rivalry: 5,
  carry: 5,
  consistency: 5,
  upset: 10,
  trios: 8,
  family: 10,
  balanced: 10,
} as const;

export const METRIC_META: Record<string, DashboardMetricMeta> = {
  combos: {
    explanation:
      "Shows which player pairs improve or hurt win rate most when teamed up versus when both play but stay on different teams.",
    constraintLabel:
      "Players >=20 rounds, together >=8 rounds, apart >=8 rounds.",
    topNLabel: "Top 5 best and worst pair lifts.",
  },
  clutch: {
    explanation:
      "Compares player win rate in close games to their overall win rate.",
    constraintLabel: "Players >=20 rounds and >=8 close-game rounds.",
    topNLabel: "Top 5 clutch risers and droppers.",
  },
  rivalry: {
    explanation:
      "Ranks head-to-head matchups by a combined score: closeness to a 50/50 split multiplied by a sample-size weight.",
    constraintLabel: "Opponent pair must face off at least 10 rounds.",
    topNLabel: "Top 5 balanced rivalries (parity x volume).",
  },
  carry: {
    explanation:
      "Compares wins with lower-ranked teammates vs stronger-ranked teammates.",
    constraintLabel:
      "Players >=20 rounds and >=8 rounds on each side of teammate strength split.",
    topNLabel: "Top 5 carry and reverse-carry players.",
  },
  consistency: {
    explanation:
      "Measures volatility of per-round point swings; lower stdev means steadier play.",
    constraintLabel: "Players >=20 rounds.",
    topNLabel: "Top 5 steadiest and top 5 most volatile.",
  },
  upset: {
    explanation:
      "Tracks wins when a player's team had low current skill-model win probability.",
    constraintLabel:
      "Players >=20 rounds and >=6 upset opportunities (skill win prob < 40%).",
    topNLabel: "Top 10 upset converters.",
  },
  trios: {
    explanation:
      "Finds best and worst three-player same-team units by win-rate lift.",
    constraintLabel: "Trio appears together on same team in >=6 rounds.",
    topNLabel: "Top 8 best and worst trios.",
  },
  families: {
    explanation:
      "Shows pairs that most consistently end up on the same team.",
    constraintLabel:
      "Players >=20 rounds and pair shares at least 6 rounds together.",
    topNLabel: "Top 10 pairs by same-team rate, with together-vs-apart win delta in details.",
  },
  balanced: {
    explanation:
      "Rewards players who win while succeeding with a broad variety of teammates.",
    constraintLabel: "Players >=20 rounds and >=6 unique teammates.",
    topNLabel: "Top 10 balanced teammate indexes.",
  },
};
