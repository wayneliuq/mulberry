import type {
  BasketballDashboardData,
  BasketballDashboardRound,
} from "../../../lib/api/types";

export type DashboardMetricMeta = {
  explanation: string;
  constraintLabel: string;
  topNLabel: string;
};

export type RankedMetricRow = {
  label: string;
  value: number;
  valueLabel: string;
  details: string;
};

/** One row for the pro-basketball style-match table (player | pro match | fit). */
export type NbaComparisonRow = {
  playerName: string;
  nbaMatchName: string;
  previousMatchName?: string | null;
  fitScore: number;
};

export type DashboardMetricSection = DashboardMetricMeta & {
  id: string;
  title: string;
  rows: RankedMetricRow[];
};

export type DashboardMetricSplitSection = DashboardMetricMeta & {
  id: string;
  title: string;
  positiveTitle: string;
  negativeTitle: string;
  positiveRows: RankedMetricRow[];
  negativeRows: RankedMetricRow[];
};

export type DashboardMetricsModel = {
  sections: DashboardMetricSection[];
  splitSections: DashboardMetricSplitSection[];
  /** Pro basketball (NBA + WNBA) pool match; empty when nobody hits the games threshold. */
  nbaComparisons: NbaComparisonRow[];
  diagnostics: {
    totalRounds: number;
    eligibleRounds: number;
    computedAtIso: string;
  };
};

export type NormalizedRound = BasketballDashboardRound & {
  teamASet: Set<number>;
  teamBSet: Set<number>;
  participants: number[];
  winnerTeam: "A" | "B" | "draw";
  scoreMargin: number;
  entryPointDeltaByPlayerId: Map<number, number>;
};

export type DashboardComputeInput = {
  data: BasketballDashboardData;
  maxRounds: number;
};
