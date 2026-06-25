import type { GameTypeId } from "../../features/game-types/types";

export type AdminWriteAction =
  | "create_player"
  | "rename_player"
  | "set_player_family"
  | "delete_player"
  | "create_game"
  | "add_players_to_game"
  | "update_game_settings"
  | "toggle_game_player_lock"
  | "remove_game_player"
  | "delete_game"
  | "create_round"
  | "delete_round"
  | "calculate_settlement"
  | "undo_settlement"
  | "rollover_basketball_season"
  | "toggle_player_score_neutral_hidden"
  | "save_basketball_team_preset";

export type BasketballTeamPreset = {
  id: string;
  labelNumber: number;
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  teamAWinProb: number | null;
  createdAt: string;
};

export type PlayerSummary = {
  id: number;
  displayName: string;
  familyId: string | null;
  /** When true, player is hidden from leaderboards and treated as score-neutral. */
  isScoreNeutralHidden: boolean;
};

export type GameSummary = {
  id: string;
  displayName: string;
  gameTypeId: GameTypeId;
  status: "open" | "settled";
  createdAt: string;
  updatedAt: string;
  roundCount: number;
  playerCount: number;
};

export type GamePlayerSummary = {
  gamePlayerId: string;
  playerId: number;
  displayName: string;
  familyId: string | null;
  joinOrder: number;
  isLocked: boolean;
  isScoreNeutralHidden: boolean;
  total: number;
};

export type RoundEntrySummary = {
  playerId: number;
  displayName: string;
  pointDelta: number;
};

export type RoundSummary = {
  id: string;
  roundNumber: number;
  createdAt: string;
  summaryText: string;
  /** Stored on each round for reproducible game-type calculations (e.g. basketball rosters). */
  settingsSnapshot?: Record<string, unknown>;
  entries: RoundEntrySummary[];
};

export type SettlementTransferSummary = {
  id: string;
  fromLabel: string;
  toLabel: string;
  amountCents: number;
};

export type SettlementSummary = {
  id: string;
  createdAt: string;
  transfers: SettlementTransferSummary[];
  playerImpacts: Array<{
    playerId: number;
    displayName: string;
    amountCents: number;
  }>;
};

export type GameDetails = {
  id: string;
  displayName: string;
  gameTypeId: GameTypeId;
  status: "open" | "settled";
  pointBasis: number;
  moneyPerPointCents: number;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  players: GamePlayerSummary[];
  rounds: RoundSummary[];
  settlement: SettlementSummary | null;
  basketballTeamPresets?: BasketballTeamPreset[];
};

export type PlayerLeaderboardRow = {
  playerId: number;
  displayName: string;
  familyId: string | null;
  totalPoints: number;
  totalMoneyCents: number;
  roundsWon: number;
  roundsLost: number;
  gamesWon: number;
  gamesLost: number;
};

export type FamilyLeaderboardRow = {
  familyId: string;
  familyName: string;
  memberNames: string[];
  totalPoints: number;
  totalMoneyCents: number;
  roundsWon: number;
  roundsLost: number;
  gamesWon: number;
  gamesLost: number;
};

export type LeaderboardData = {
  seasonId?: number;
  players: PlayerLeaderboardRow[];
  families: FamilyLeaderboardRow[];
};

export type BasketballDashboardPlayer = {
  id: number;
  displayName: string;
  familyId: string | null;
};

export type BasketballDashboardRound = {
  roundId: string;
  gameId: string;
  roundNumber: number;
  createdAt: string;
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  scoreTeamA: number;
  scoreTeamB: number;
};

export type BasketballDashboardRoundEntry = {
  roundId: string;
  playerId: number;
  pointDelta: number;
};

export type BasketballSeasonSummary = {
  id: number;
  seasonNumber: number;
  displayName: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  schemaVersion: number;
};

export type BasketballSeasonsPayload = {
  seasons: BasketballSeasonSummary[];
  activeSeasonId: number;
};

export type BasketballDashboardData = {
  seasonId: number;
  players: BasketballDashboardPlayer[];
  rounds: BasketballDashboardRound[];
  roundEntries: BasketballDashboardRoundEntry[];
};

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
