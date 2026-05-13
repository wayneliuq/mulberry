import type { GameTypeId } from "../../features/game-types/types";
import { selectAll, supabase } from "../supabase/client";
import type {
  BasketballDashboardData,
  BasketballDashboardRound,
  BasketballDashboardRoundEntry,
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
    is_active?: boolean;
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
  game_id: string;
  round_number: number;
  summary_text?: string | null;
  created_at: string;
  settings_snapshot: Record<string, unknown> | null;
};

type RawRoundEntry = {
  round_id: string;
  player_id: number;
  point_delta: number;
  players: Array<{
    display_name: string;
    is_active?: boolean;
  }> | null;
};

type RawRoundEntryMetric = {
  round_id: string;
  player_id: number;
  point_delta: number;
};

type GroupedUnit = {
  id: string;
  label: string;
  amountCents: number;
  playerIds: number[];
};

type TotalsSnapshotEntry = {
  playerId: number;
  displayName: string;
  familyId: string | null;
  amountCents: number;
};

type RawSettlement = {
  id: string;
  created_at: string;
  grouped_units?: GroupedUnit[];
  totals_snapshot?: TotalsSnapshotEntry[];
};

type RawTransfer = {
  id: string;
  amount_cents: number;
  family_label: string | null;
  from_player_id: number | null;
  to_player_id: number | null;
  from_player?:
    | Array<{ display_name: string; is_active?: boolean }>
    | { display_name: string; is_active?: boolean }
    | null;
  to_player?:
    | Array<{ display_name: string; is_active?: boolean }>
    | { display_name: string; is_active?: boolean }
    | null;
};

type RawSettlementPlayer = {
  player_id: number;
  amount_cents: number;
  players: Array<{
    display_name: string;
    is_active?: boolean;
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
  const { data, error } = await selectAll<RawPlayer>((from, to) =>
    supabase
      .from("players")
      .select("id, display_name, family_id")
      .eq("is_active", true)
      .order("display_name", { ascending: true })
      .range(from, to),
  );

  if (error) {
    throw new Error(error.message);
  }

  return data.map<PlayerSummary>((player) => ({
    id: player.id,
    displayName: player.display_name,
    familyId: player.family_id,
  }));
}

export async function fetchGames() {
  const { data, error } = await selectAll<RawGameSummary>((from, to) =>
    supabase
      .from("game_summaries")
      .select(
        "game_id, display_name, game_type_id, status, created_at, updated_at, round_count, player_count",
      )
      .order("updated_at", { ascending: false })
      .range(from, to),
  );

  if (error) {
    throw new Error(error.message);
  }

  return data.map<GameSummary>((game) => ({
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

export const DELETED_PLAYER_DISPLAY_NAME = "Deleted Player";

function getNestedDisplayName(
  p:
    | Array<{ display_name: string; is_active?: boolean }>
    | { display_name: string; is_active?: boolean }
    | null
    | undefined,
): string {
  if (!p) return DELETED_PLAYER_DISPLAY_NAME;
  const obj = Array.isArray(p) ? p[0] : p;
  if (!obj) return DELETED_PLAYER_DISPLAY_NAME;
  return obj.is_active === false ? DELETED_PLAYER_DISPLAY_NAME : (obj.display_name ?? DELETED_PLAYER_DISPLAY_NAME);
}

async function fetchSettlement(gameId: string): Promise<SettlementSummary | null> {
  const { data: settlementData, error: settlementError } = await supabase
    .from("money_settlements")
    .select("id, created_at, grouped_units, totals_snapshot")
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
          "id, amount_cents, family_label, from_player_id, to_player_id, from_player:players!money_transfers_from_player_id_fkey(display_name, is_active), to_player:players!money_transfers_to_player_id_fkey(display_name, is_active)",
        )
        .eq("settlement_id", settlement.id),
      supabase
        .from("money_settlement_players")
        .select("player_id, amount_cents, players(display_name, is_active)")
        .eq("settlement_id", settlement.id),
    ]);

  if (transfersError) {
    throw new Error(transfersError.message);
  }

  if (playerImpactsError) {
    throw new Error(playerImpactsError.message);
  }

  const groupedUnits = (settlement.grouped_units ?? []) as GroupedUnit[];
  const totalsSnapshot = (settlement.totals_snapshot ?? []) as TotalsSnapshotEntry[];
  const playerIdToName = new Map(
    totalsSnapshot.map((e) => [e.playerId, e.displayName]),
  );

  const inactivePlayerIds = new Set<number>();
  for (const t of transfersData ?? []) {
    const tr = t as RawTransfer;
    if (tr.from_player_id != null) {
      const p = tr.from_player;
      const obj = Array.isArray(p) ? p[0] : p;
      if (obj?.is_active === false) inactivePlayerIds.add(tr.from_player_id);
    }
    if (tr.to_player_id != null) {
      const p = tr.to_player;
      const obj = Array.isArray(p) ? p[0] : p;
      if (obj?.is_active === false) inactivePlayerIds.add(tr.to_player_id);
    }
  }
  for (const impact of playerImpactsData ?? []) {
    const imp = impact as RawSettlementPlayer;
    const p = imp.players;
    const obj = Array.isArray(p) ? p[0] : p;
    if (obj?.is_active === false) inactivePlayerIds.add(imp.player_id);
  }

  function formatUnitLabel(
    playerId: number | null,
    familyLabelPart: string | undefined,
    joinedDisplayName: string,
  ): string {
    if (playerId != null) {
      return joinedDisplayName || playerIdToName.get(playerId) || String(playerId);
    }
    if (familyLabelPart) {
      const unit = groupedUnits.find((u) => u.label === familyLabelPart);
      if (unit && unit.playerIds.length > 1) {
        const names = unit.playerIds
          .map((id) =>
            inactivePlayerIds.has(id)
              ? DELETED_PLAYER_DISPLAY_NAME
              : playerIdToName.get(id) ?? String(id),
          )
          .join(", ");
        return names || familyLabelPart;
      }
      return familyLabelPart;
    }
    return "Unknown";
  }

  return {
    id: settlement.id,
    createdAt: settlement.created_at,
    transfers: (transfersData ?? []).map((transfer: RawTransfer) => {
      const fromPart = transfer.family_label?.split(" -> ")[0];
      const toPart = transfer.family_label?.split(" -> ")[1];
      const fromJoined = getNestedDisplayName(transfer.from_player);
      const toJoined = getNestedDisplayName(transfer.to_player);
      return {
        id: transfer.id,
        fromLabel: formatUnitLabel(
          transfer.from_player_id,
          fromPart,
          fromJoined,
        ),
        toLabel: formatUnitLabel(transfer.to_player_id, toPart, toJoined),
        amountCents: transfer.amount_cents,
      };
    }),
    playerImpacts: (playerImpactsData ?? []).map((impact: RawSettlementPlayer) => ({
      playerId: impact.player_id,
      displayName: getNestedDisplayName(impact.players),
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
      .select("id, player_id, join_order, is_locked, players(id, display_name, family_id, is_active)")
      .eq("game_id", gameId)
      .order("join_order", { ascending: true }),
    supabase
      .from("game_point_totals")
      .select("game_id, game_player_id, player_id, point_total")
      .eq("game_id", gameId),
    selectAll<RawRound>((from, to) =>
      supabase
        .from("rounds")
        .select(
          "id, game_id, round_number, summary_text, created_at, settings_snapshot",
        )
        .eq("game_id", gameId)
        .order("round_number", { ascending: false })
        .range(from, to),
    ),
    selectAll<RawRoundEntry>((from, to) =>
      supabase
        .from("round_entries")
        .select(
          "round_id, player_id, point_delta, players(display_name, is_active)",
        )
        .eq("game_id", gameId)
        .range(from, to),
    ),
    fetchSettlement(gameId),
  ]);

  const game = assertData(gameResult.data as RawGame | null, gameResult.error);

  if (
    game.game_type_id !== "texas-holdem" &&
    game.game_type_id !== "fight-the-landlord" &&
    game.game_type_id !== "werewolves" &&
    game.game_type_id !== "dixit" &&
    game.game_type_id !== "basketball"
  ) {
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

  for (const entry of roundEntriesResult.data) {
    const existingEntries = roundEntriesByRoundId.get(entry.round_id) ?? [];
    const displayName = getNestedDisplayName(entry.players);
    existingEntries.push({
      playerId: entry.player_id,
      displayName,
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
    players: ((gamePlayersResult.data ?? []) as RawGamePlayer[]).map((player) => {
      const p = player.players;
      const nested = Array.isArray(p) ? p[0] : p;
      const displayName =
        nested?.is_active === false
          ? DELETED_PLAYER_DISPLAY_NAME
          : (nested?.display_name ?? String(player.player_id));
      return {
        gamePlayerId: player.id,
        playerId: player.player_id,
        displayName,
        familyId: nested?.family_id ?? null,
        joinOrder: player.join_order,
        isLocked: player.is_locked,
        total: totalByGamePlayerId.get(player.id) ?? 0,
      };
    }),
    rounds: roundsResult.data.map((round) => ({
      id: round.id,
      roundNumber: round.round_number,
      createdAt: round.created_at,
      summaryText: round.summary_text ?? `Round ${round.round_number}`,
      settingsSnapshot: round.settings_snapshot ?? undefined,
      entries:
        roundEntriesByRoundId
          .get(round.id)
          ?.sort((left, right) => right.pointDelta - left.pointDelta) ?? [],
    })),
    settlement,
  };
}

export type BasketballRoundHistoryRow = {
  roundId: string;
  gameId: string;
  roundNumber: number;
  createdAt: string;
  settingsSnapshot?: Record<string, unknown>;
};

export async function fetchBasketballRoundHistory(): Promise<BasketballRoundHistoryRow[]> {
  const { data, error } = await selectAll<RawRound>((from, to) =>
    supabase
      .from("rounds")
      .select("id, game_id, round_number, created_at, settings_snapshot")
      .eq("game_type_id", "basketball")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );

  if (error) {
    throw new Error(error.message);
  }

  return data.map((round) => ({
    roundId: round.id,
    gameId: round.game_id,
    roundNumber: round.round_number,
    createdAt: round.created_at,
    settingsSnapshot: round.settings_snapshot ?? undefined,
  }));
}

function isIntegerArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item));
}

function parseBasketballRound(
  round: RawRound,
): BasketballDashboardRound | null {
  const snapshot = round.settings_snapshot;
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const metadata = (snapshot as Record<string, unknown>).metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const mode = (metadata as Record<string, unknown>).mode;
  if (mode !== "basketball") {
    return null;
  }
  const teamAPlayerIds = (metadata as Record<string, unknown>).teamAPlayerIds;
  const teamBPlayerIds = (metadata as Record<string, unknown>).teamBPlayerIds;
  const scoreTeamA = (metadata as Record<string, unknown>).scoreTeamA;
  const scoreTeamB = (metadata as Record<string, unknown>).scoreTeamB;
  if (
    !isIntegerArray(teamAPlayerIds) ||
    !isIntegerArray(teamBPlayerIds) ||
    teamAPlayerIds.length < 1 ||
    teamBPlayerIds.length < 1 ||
    !Number.isInteger(scoreTeamA) ||
    !Number.isInteger(scoreTeamB) ||
    (scoreTeamA as number) < 0 ||
    (scoreTeamB as number) < 0
  ) {
    return null;
  }
  const teamASet = new Set<number>(teamAPlayerIds);
  const teamBSet = new Set<number>(teamBPlayerIds);
  if (teamASet.size !== teamAPlayerIds.length || teamBSet.size !== teamBPlayerIds.length) {
    return null;
  }
  for (const playerId of teamASet) {
    if (teamBSet.has(playerId)) {
      return null;
    }
  }
  return {
    roundId: round.id,
    gameId: round.game_id,
    roundNumber: round.round_number,
    createdAt: round.created_at,
    teamAPlayerIds,
    teamBPlayerIds,
    scoreTeamA: scoreTeamA as number,
    scoreTeamB: scoreTeamB as number,
  };
}

export async function fetchBasketballDashboardData(): Promise<BasketballDashboardData> {
  const [roundsResult, entriesResult, playersResult] = await Promise.all([
    selectAll<RawRound>((from, to) =>
      supabase
        .from("rounds")
        .select("id, game_id, round_number, created_at, settings_snapshot")
        .eq("game_type_id", "basketball")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    selectAll<RawRoundEntryMetric>((from, to) =>
      supabase
        .from("round_entries")
        .select("round_id, player_id, point_delta")
        .range(from, to),
    ),
    selectAll<RawPlayer>((from, to) =>
      supabase
        .from("players")
        .select("id, display_name, family_id")
        .eq("is_active", true)
        .range(from, to),
    ),
  ]);

  if (roundsResult.error) {
    throw new Error(roundsResult.error.message);
  }
  if (entriesResult.error) {
    throw new Error(entriesResult.error.message);
  }
  if (playersResult.error) {
    throw new Error(playersResult.error.message);
  }

  const rounds = roundsResult.data
    .map(parseBasketballRound)
    .filter((round): round is BasketballDashboardRound => round !== null);
  const roundIdSet = new Set(rounds.map((round) => round.roundId));

  const roundEntries = entriesResult.data
    .filter((entry) => roundIdSet.has(entry.round_id))
    .map<BasketballDashboardRoundEntry>((entry) => ({
      roundId: entry.round_id,
      playerId: entry.player_id,
      pointDelta: entry.point_delta,
    }));

  const players = playersResult.data
    .map((player) => ({
      id: player.id,
      displayName: player.display_name,
      familyId: player.family_id,
    }))
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, undefined, {
        sensitivity: "base",
      }),
    );

  return {
    players,
    rounds,
    roundEntries,
  };
}

type RawRoundEntryRow = {
  player_id: number;
  point_delta: number;
  game_id: string;
};

type RawMoneySettlementPlayer = {
  player_id: number;
  amount_cents: number;
  money_settlements: { game_id: string } | { game_id: string }[] | null;
};

export async function fetchLeaderboards(
  gameTypeFilter: GameTypeId | "all" = "all",
): Promise<LeaderboardData> {
  const [gamesResult, totalsResult, playersResult, familiesResult] = await Promise.all([
    selectAll<{ id: string; game_type_id: GameTypeId }>((from, to) =>
      supabase.from("games").select("id, game_type_id").range(from, to),
    ),
    selectAll<RawGamePointTotal>((from, to) =>
      supabase
        .from("game_point_totals")
        .select("game_id, game_player_id, player_id, point_total")
        .range(from, to),
    ),
    selectAll<RawPlayer>((from, to) =>
      supabase
        .from("players")
        .select("id, display_name, family_id")
        .eq("is_active", true)
        .range(from, to),
    ),
    selectAll<RawFamily>((from, to) =>
      supabase.from("families").select("id, name").range(from, to),
    ),
  ]);

  if (gamesResult.error) {
    throw new Error(gamesResult.error.message);
  }
  if (totalsResult.error) {
    throw new Error(totalsResult.error.message);
  }
  if (playersResult.error) {
    throw new Error(playersResult.error.message);
  }
  if (familiesResult.error) {
    throw new Error(familiesResult.error.message);
  }

  const games = gamesResult.data;
  const gameTypeByGameId = new Map(games.map((g) => [g.id, g.game_type_id]));
  const filteredGameIds = new Set(
    gameTypeFilter === "all"
      ? games.map((g) => g.id)
      : games.filter((g) => g.game_type_id === gameTypeFilter).map((g) => g.id),
  );

  const [roundEntriesResult, moneyResult] = await Promise.all([
    filteredGameIds.size > 0
      ? selectAll<RawRoundEntryRow>((from, to) =>
          supabase
            .from("round_entries")
            .select("player_id, point_delta, game_id")
            .in("game_id", Array.from(filteredGameIds))
            .range(from, to),
        )
      : { data: [] as RawRoundEntryRow[], error: null },
    selectAll<RawMoneySettlementPlayer>((from, to) =>
      supabase
        .from("money_settlement_players")
        .select("player_id, amount_cents, money_settlements(game_id)")
        .range(from, to),
    ),
  ]);

  if (roundEntriesResult.error) {
    throw new Error(roundEntriesResult.error.message);
  }
  if (moneyResult.error) {
    throw new Error(moneyResult.error.message);
  }

  const roundEntries = roundEntriesResult.data ?? [];
  const moneyRows = moneyResult.data ?? [];

  const moneyByPlayerId = new Map<number, number>();
  for (const row of moneyRows) {
    const settlement = row.money_settlements;
    const gameId = Array.isArray(settlement)
      ? settlement[0]?.game_id
      : settlement?.game_id;
    if (gameId && filteredGameIds.has(gameId)) {
      const current = moneyByPlayerId.get(row.player_id) ?? 0;
      moneyByPlayerId.set(row.player_id, current + row.amount_cents);
    }
  }

  const pointsByPlayerId = new Map<
    number,
    { totalPoints: number; roundsWon: number; roundsLost: number }
  >();
  for (const entry of roundEntries) {
    const existing = pointsByPlayerId.get(entry.player_id) ?? {
      totalPoints: 0,
      roundsWon: 0,
      roundsLost: 0,
    };
    existing.totalPoints += entry.point_delta;
    if (entry.point_delta > 0) existing.roundsWon += 1;
    else if (entry.point_delta < 0) existing.roundsLost += 1;
    pointsByPlayerId.set(entry.player_id, existing);
  }

  const filteredGameTotals = totalsResult.data.filter((row) =>
    filteredGameIds.has(row.game_id),
  );

  const gameWinLossByPlayerId = new Map<number, { gamesWon: number; gamesLost: number }>();
  for (const total of filteredGameTotals) {
    const existing = gameWinLossByPlayerId.get(total.player_id) ?? {
      gamesWon: 0,
      gamesLost: 0,
    };
    if (total.point_total > 0) existing.gamesWon += 1;
    else if (total.point_total < 0) existing.gamesLost += 1;
    gameWinLossByPlayerId.set(total.player_id, existing);
  }

  const allPlayers = playersResult.data;
  const activePlayerIds = new Set(allPlayers.map((p) => p.id));
  const playerById = new Map(allPlayers.map((p) => [p.id, p]));

  const allPlayerIds = new Set<number>();
  for (const id of pointsByPlayerId.keys()) allPlayerIds.add(id);
  for (const id of moneyByPlayerId.keys()) allPlayerIds.add(id);
  for (const id of gameWinLossByPlayerId.keys()) allPlayerIds.add(id);

  const playerRows: PlayerLeaderboardRow[] = Array.from(allPlayerIds)
    .filter((id) => activePlayerIds.has(id))
    .map((playerId): PlayerLeaderboardRow => {
      const player = playerById.get(playerId);
      const points = pointsByPlayerId.get(playerId) ?? {
        totalPoints: 0,
        roundsWon: 0,
        roundsLost: 0,
      };
      const gameStats = gameWinLossByPlayerId.get(playerId) ?? {
        gamesWon: 0,
        gamesLost: 0,
      };
      return {
        playerId,
        displayName: player?.display_name ?? String(playerId),
        familyId: player?.family_id ?? null,
        totalPoints: points.totalPoints,
        totalMoneyCents: moneyByPlayerId.get(playerId) ?? 0,
        roundsWon: points.roundsWon,
        roundsLost: points.roundsLost,
        gamesWon: gameStats.gamesWon,
        gamesLost: gameStats.gamesLost,
      };
    })
    .sort((left, right) => right.totalPoints - left.totalPoints);

  const families = familiesResult.data;

  const familyRows: FamilyLeaderboardRow[] = families
    .map((family) => {
      const members = allPlayers.filter(
        (player) => player.family_id === family.id,
      );
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
