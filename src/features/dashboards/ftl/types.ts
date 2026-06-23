export type FtlDashboardRound = {
  roundId: string;
  gameId: string;
  createdAt: string;
  landlordSideSelections: number[];
  numBombs: number;
  gameMultiplier: number;
  outcome: "won" | "lost";
};

export type FtlDashboardRoundEntry = {
  roundId: string;
  playerId: number;
  pointDelta: number;
};

export type FtlDashboardPlayer = {
  id: number;
  displayName: string;
  familyId: string | null;
};

export type FtlDashboardData = {
  players: FtlDashboardPlayer[];
  rounds: FtlDashboardRound[];
  roundEntries: FtlDashboardRoundEntry[];
};

export type FtlStatRow = {
  label: string;
  value: number;
  valueLabel: string;
  details: string;
};

export type FtlDashboardSection = {
  id: string;
  title: string;
  explanation: string;
  rows: FtlStatRow[];
};

export type FtlDashboardSplitSection = {
  id: string;
  title: string;
  explanation: string;
  positiveTitle: string;
  negativeTitle: string;
  positiveRows: FtlStatRow[];
  negativeRows: FtlStatRow[];
};

export type FtlDashboardModel = {
  overallWinRate: { rate: number; wins: number; losses: number; total: number };
  sections: FtlDashboardSection[];
  splitSections: FtlDashboardSplitSection[];
  diagnostics: { totalRounds: number; eligiblePlayers: number };
};
