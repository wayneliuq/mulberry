import type { GameTypeId } from "../../features/game-types/types";
import { supabase } from "../supabase/client";
import type {
  FamilyLeaderboardRow,
  GameDetails,
  GameSummary,
  LeaderboardData,
  PlayerLeaderboardRow,
  PlayerSummary,
  RoundSummary,
  SettlementSummary,
} from "./types";

type RawGameSummary = {
  game_id: string;
  display_name: string;
  game_type_id: GameTypeId;
  status: "open" | "settled";
  created_at: string;
  updated_at: string;
  round_count: number;
  player_count: number;
};

type RawGamePlayer = {
  id: string;
  player_id: number;
  join_order: number;
  is_locked: boolean;
  players: Array<{
    id: number;
    display_name: string;
    family_id: string | null;
  }> | null;
};

type RawGame = {
  id: string;
  display_name: string;
  game_type_id: GameTypeId;
  status: "open" | "settled";
  point_basis: number;
  money_per_point_cents: number;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
};

type RawGamePointTotal = {
  game_id: string;
  game_player_id: string;
  player_id: number;
  point_total: number;
};

type RawRound = {
  id: string;
  round_number: number;
  summary_text: string | null;
  created_at: string;
};

type RawRoundEntry = {
  round_id: string;
  player_id: number;
  point_delta: number;
  players: Array<{
    display_name: string;
  }> | null;
};

type RawSettlement = {
  id: string;
  created_at: string;
};

type RawTransfer = {
  id: string;
  amount_cents: number;
  family_label: string | null;
  from_player_id: number | null;
  to_player_id: number | null;
  from_player?: Array<{
    display_name: string;
  }> | null;
  to_player?: Array<{
    display_name: string;
  }> | null;
};

type RawSettlementPlayer = {
  player_id: number;
  amount_cents: number;
  players: Array<{
    display_name: string;
  }> | null;
};

type RawPlayerPointsLeaderboard = {
  player_id: number;
  display_name: string;
  family_id: string | null;
  total_points: number;
  rounds_won: number;
  rounds_lost: number;
};

type RawPlayerMoneyLeaderboard = {
  player_id: number;
  display_name: string;
  total_money_cents: number;
};

type RawFamily = {
  id: string;
  name: string;
};

type RawPlayer = {
  id: number;
  display_name: string;
  family_id: string | null;
};

function assertData<T>(data: T | null, error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }

  if (data === null) {
    throw new Error("Missing data");
  }

  return data;
}

export async function fetchPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("id, display_name, family_id")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map<PlayerSummary>((player) => ({
    id: player.id,
    displayName: player.display_name,
    familyId: player.family_id,
  }));
}

export async function fetchGames() {
  const { data, error } = await supabase
    .from("game_summaries")
    .select("game_id, display_name, game_type_id, status, created_at, updated_at, round_count, player_count")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map<GameSummary>((game: RawGameSummary) => ({
    id: game.game_id,
    displayName: game.display_name,
    gameTypeId: game.game_type_id,
    status: game.status,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
    roundCount: game.round_count,
    playerCount: game.player_count,
  }));
}

async function fetchSettlement(gameId: string): Promise<SettlementSummary | null> {
  const { data: settlementData, error: settlementError } = await supabase
    .from("money_settlements")
    .select("id, created_at")
    .eq("game_id", gameId)
    .maybeSingle();

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  if (!settlementData) {
    return null;
  }

  const settlement = settlementData as RawSettlement;

  const [{ data: transfersData, error: transfersError }, { data: playerImpactsData, error: playerImpactsError }] =
    await Promise.all([
      supabase
        .from("money_transfers")
        .select(
          "id, amount_cents, family_label, from_player_id, to_player_id, from_player:players!money_transfers_from_player_id_fkey(display_name), to_player:players!money_transfers_to_player_id_fkey(display_name)",
        )
        .eq("settlement_id", settlement.id),
      supabase
        .from("money_settlement_players")
        .select("player_id, amount_cents, players(display_name)")
        .eq("settlement_id", settlement.id),
    ]);

  if (transfersError) {
    throw new Error(transfersError.message);
  }

  if (playerImpactsError) {
    throw new Error(playerImpactsError.message);
  }

  return {
    id: settlement.id,
    createdAt: settlement.created_at,
    transfers: (transfersData ?? []).map((transfer: RawTransfer) => ({
      id: transfer.id,
      fromLabel:
        transfer.family_label?.split(" -> ")[0] ??
        transfer.from_player?.[0]?.display_name ??
        "Grouped unit",
      toLabel:
        transfer.family_label?.split(" -> ")[1] ??
        transfer.to_player?.[0]?.display_name ??
        "Grouped unit",
      amountCents: transfer.amount_cents,
    })),
    playerImpacts: (playerImpactsData ?? []).map((impact: RawSettlementPlayer) => ({
      playerId: impact.player_id,
      displayName: impact.players?.[0]?.display_name ?? String(impact.player_id),
      amountCents: impact.amount_cents,
    })),
  };
}

export async function fetchGameDetails(gameId: string): Promise<GameDetails> {
  const [
    gameResult,
    gamePlayersResult,
    totalsResult,
    roundsResult,
    roundEntriesResult,
    settlement,
  ] = await Promise.all([
    supabase
      .from("games")
      .select("id, display_name, game_type_id, status, point_basis, money_per_point_cents, created_at, updated_at, ended_at")
      .eq("id", gameId)
      .single(),
    supabase
      .from("game_players")
      .select("id, player_id, join_order, is_locked, players(id, display_name, family_id)")
      .eq("game_id", gameId)
      .order("join_order", { ascending: true }),
    supabase
      .from("game_point_totals")
      .select("game_id, game_player_id, player_id, point_total")
      .eq("game_id", gameId),
    supabase
      .from("rounds")
      .select("id, round_number, summary_text, created_at")
      .eq("game_id", gameId)
      .order("round_number", { ascending: false }),
    supabase
      .from("round_entries")
      .select("round_id, player_id, point_delta, players(display_name)")
      .eq("game_id", gameId),
    fetchSettlement(gameId),
  ]);

  const game = assertData(gameResult.data as RawGame | null, gameResult.error);

  if (game.game_type_id !== "texas-holdem" && game.game_type_id !== "fight-the-landlord") {
    throw new Error("Unsupported game type");
  }

  if (gamePlayersResult.error) {
    throw new Error(gamePlayersResult.error.message);
  }

  if (totalsResult.error) {
    throw new Error(totalsResult.error.message);
  }

  if (roundsResult.error) {
    throw new Error(roundsResult.error.message);
  }

  if (roundEntriesResult.error) {
    throw new Error(roundEntriesResult.error.message);
  }

  const totalByGamePlayerId = new Map(
    ((totalsResult.data ?? []) as RawGamePointTotal[]).map((row) => [
      row.game_player_id,
      row.point_total,
    ]),
  );

  const roundEntriesByRoundId = new Map<string, RoundSummary["entries"]>();

  for (const entry of (roundEntriesResult.data ?? []) as RawRoundEntry[]) {
    const existingEntries = roundEntriesByRoundId.get(entry.round_id) ?? [];
    existingEntries.push({
      playerId: entry.player_id,
      displayName: entry.players?.[0]?.display_name ?? String(entry.player_id),
      pointDelta: entry.point_delta,
    });
    roundEntriesByRoundId.set(entry.round_id, existingEntries);
  }

  return {
    id: game.id,
    displayName: game.display_name,
    gameTypeId: game.game_type_id,
    status: game.status,
    pointBasis: game.point_basis,
    moneyPerPointCents: game.money_per_point_cents,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
    endedAt: game.ended_at,
    players: ((gamePlayersResult.data ?? []) as RawGamePlayer[]).map((player) => ({
      gamePlayerId: player.id,
      playerId: player.player_id,
      displayName: player.players?.[0]?.display_name ?? String(player.player_id),
      familyId: player.players?.[0]?.family_id ?? null,
      joinOrder: player.join_order,
      isLocked: player.is_locked,
      total: totalByGamePlayerId.get(player.id) ?? 0,
    })),
    rounds: ((roundsResult.data ?? []) as RawRound[]).map((round) => ({
      id: round.id,
      roundNumber: round.round_number,
      createdAt: round.created_at,
      summaryText: round.summary_text ?? `Round ${round.round_number}`,
      entries:
        roundEntriesByRoundId
          .get(round.id)
          ?.sort((left, right) => right.pointDelta - left.pointDelta) ?? [],
    })),
    settlement,
  };
}

export async function fetchLeaderboards(
  gameTypeFilter: GameTypeId | "all" = "all",
): Promise<LeaderboardData> {
  const [
    pointsResult,
    moneyResult,
    totalsResult,
    gamesResult,
    playersResult,
    familiesResult,
  ] = await Promise.all([
    supabase
      .from("player_points_leaderboard")
      .select("player_id, display_name, family_id, total_points, rounds_won, rounds_lost"),
    supabase
      .from("player_money_leaderboard")
      .select("player_id, display_name, total_money_cents"),
    supabase
      .from("game_point_totals")
      .select("game_id, game_player_id, player_id, point_total"),
    supabase.from("games").select("id, game_type_id"),
    supabase.from("players").select("id, display_name, family_id"),
    supabase.from("families").select("id, name"),
  ]);

  if (pointsResult.error) {
    throw new Error(pointsResult.error.message);
  }

  if (moneyResult.error) {
    throw new Error(moneyResult.error.message);
  }

  if (totalsResult.error) {
    throw new Error(totalsResult.error.message);
  }

  if (gamesResult.error) {
    throw new Error(gamesResult.error.message);
  }

  if (playersResult.error) {
    throw new Error(playersResult.error.message);
  }

  if (familiesResult.error) {
    throw new Error(familiesResult.error.message);
  }

  const moneyByPlayerId = new Map(
    ((moneyResult.data ?? []) as RawPlayerMoneyLeaderboard[]).map((row) => [
      row.player_id,
      row.total_money_cents,
    ]),
  );

  const gameTypeByGameId = new Map(
    (gamesResult.data ?? []).map((game) => [game.id as string, game.game_type_id as GameTypeId]),
  );

  const filteredGameTotals = ((totalsResult.data ?? []) as RawGamePointTotal[]).filter(
    (row) =>
      gameTypeFilter === "all" ||
      gameTypeByGameId.get(row.game_id) === gameTypeFilter,
  );

  const gameWinLossByPlayerId = new Map<number, { gamesWon: number; gamesLost: number }>();

  for (const total of filteredGameTotals) {
    const existing = gameWinLossByPlayerId.get(total.player_id) ?? {
      gamesWon: 0,
      gamesLost: 0,
    };

    if (total.point_total > 0) {
      existing.gamesWon += 1;
    } else if (total.point_total < 0) {
      existing.gamesLost += 1;
    }

    gameWinLossByPlayerId.set(total.player_id, existing);
  }

  const playerRows = ((pointsResult.data ?? []) as RawPlayerPointsLeaderboard[])
    .map<PlayerLeaderboardRow>((row) => {
      const gameStats = gameWinLossByPlayerId.get(row.player_id) ?? {
        gamesWon: 0,
        gamesLost: 0,
      };

      return {
        playerId: row.player_id,
        displayName: row.display_name,
        familyId: row.family_id,
        totalPoints: row.total_points,
        totalMoneyCents: moneyByPlayerId.get(row.player_id) ?? 0,
        roundsWon: row.rounds_won,
        roundsLost: row.rounds_lost,
        gamesWon: gameStats.gamesWon,
        gamesLost: gameStats.gamesLost,
      };
    })
    .sort((left, right) => right.totalPoints - left.totalPoints);

  const players = (playersResult.data ?? []) as RawPlayer[];
  const families = (familiesResult.data ?? []) as RawFamily[];

  const familyRows: FamilyLeaderboardRow[] = families
    .map((family) => {
      const members = players.filter((player) => player.family_id === family.id);
      if (members.length < 2) {
        return null;
      }

      const memberRows = playerRows.filter((row) =>
        members.some((member) => member.id === row.playerId),
      );

      return {
        familyId: family.id,
        familyName: family.name,
        memberNames: members.map((member) => member.display_name),
        totalPoints: memberRows.reduce((sum, row) => sum + row.totalPoints, 0),
        totalMoneyCents: memberRows.reduce(
          (sum, row) => sum + row.totalMoneyCents,
          0,
        ),
        roundsWon: memberRows.reduce((sum, row) => sum + row.roundsWon, 0),
        roundsLost: memberRows.reduce((sum, row) => sum + row.roundsLost, 0),
        gamesWon: memberRows.reduce((sum, row) => sum + row.gamesWon, 0),
        gamesLost: memberRows.reduce((sum, row) => sum + row.gamesLost, 0),
      };
    })
    .filter((family): family is FamilyLeaderboardRow => family !== null)
    .sort((left, right) => right.totalPoints - left.totalPoints);

  return {
    players: playerRows,
    families: familyRows,
  };
}
