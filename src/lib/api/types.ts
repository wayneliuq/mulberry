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
  | "undo_settlement";

export type PlayerSummary = {
  id: number;
  displayName: string;
  familyId: string | null;
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
  players: PlayerLeaderboardRow[];
  families: FamilyLeaderboardRow[];
};
