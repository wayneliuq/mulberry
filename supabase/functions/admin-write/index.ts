import { z } from "npm:zod@4";
import {
  createVerifiedAdminClient,
  insertAuditLog,
  invalidRequestResponse,
  jsonResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
} from "../_shared/admin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const uuidSchema = z.string().uuid();

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_player"),
    password: z.string(),
    displayName: z.string().trim().min(1),
    familyName: z.string().trim().optional().nullable(),
  }),
  z.object({
    action: z.literal("rename_player"),
    password: z.string(),
    playerId: z.number().int().positive(),
    displayName: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("set_player_family"),
    password: z.string(),
    playerId: z.number().int().positive(),
    familyName: z.string().trim().nullable(),
  }),
  z.object({
    action: z.literal("delete_player"),
    password: z.string(),
    playerId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("create_game"),
    password: z.string(),
    gameTypeId: z.enum([
      "texas-holdem",
      "fight-the-landlord",
      "werewolves",
      "dixit",
      "basketball",
    ]),
    pointBasis: z.number().int().min(1),
    moneyPerPointCents: z.number().int().min(0),
    displayName: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("add_players_to_game"),
    password: z.string(),
    gameId: uuidSchema,
    playerIds: z.array(z.number().int().positive()).min(1),
  }),
  z.object({
    action: z.literal("update_game_settings"),
    password: z.string(),
    gameId: uuidSchema,
    displayName: z.string().trim().min(1),
    pointBasis: z.number().int().min(1),
    moneyPerPointCents: z.number().int().min(0),
  }),
  z.object({
    action: z.literal("toggle_game_player_lock"),
    password: z.string(),
    gameId: uuidSchema,
    gamePlayerId: uuidSchema,
    isLocked: z.boolean(),
  }),
  z.object({
    action: z.literal("remove_game_player"),
    password: z.string(),
    gameId: uuidSchema,
    gamePlayerId: uuidSchema,
  }),
  z.object({
    action: z.literal("delete_game"),
    password: z.string(),
    gameId: uuidSchema,
  }),
  z.object({
    action: z.literal("create_round"),
    password: z.string(),
    gameId: uuidSchema,
    gameTypeId: z.enum([
      "texas-holdem",
      "fight-the-landlord",
      "werewolves",
      "dixit",
      "basketball",
    ]),
    summaryText: z.string().trim().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
    entries: z
      .array(
        z.object({
          playerId: z.number().int().positive(),
          pointDelta: z.float64(),
        }),
      )
      .min(2),
  }),
  z.object({
    action: z.literal("delete_round"),
    password: z.string(),
    gameId: uuidSchema,
    roundId: uuidSchema,
  }),
  z.object({
    action: z.literal("calculate_settlement"),
    password: z.string(),
    gameId: uuidSchema,
  }),
  z.object({
    action: z.literal("undo_settlement"),
    password: z.string(),
    gameId: uuidSchema,
  }),
]);

type AdminAction = z.infer<typeof actionSchema>;

type PlayerRow = {
  id: number;
  display_name: string;
  family_id: string | null;
};

type GamePlayerRow = {
  id: string;
  game_id: string;
  player_id: number;
  join_order: number;
  is_locked: boolean;
};

type GameRow = {
  id: string;
  game_type_id:
    | "texas-holdem"
    | "fight-the-landlord"
    | "werewolves"
    | "dixit"
    | "basketball";
  display_name: string;
  point_basis: number;
  money_per_point_cents: number;
  status: "open" | "settled";
};

type GamePointTotalRow = {
  game_id: string;
  game_player_id: string;
  player_id: number;
  point_total: number;
};

function unauthorizedResponse() {
  return jsonResponse({ error: "Invalid admin password" }, 401);
}

function formatDefaultGameName(gameTypeId: string) {
  const date = new Date().toISOString().slice(0, 10);
  const gameTypeName =
    gameTypeId === "fight-the-landlord"
      ? "Fight the Landlord"
      : gameTypeId === "werewolves"
        ? "Werewolves"
        : gameTypeId === "dixit"
          ? "Dixit"
          : gameTypeId === "basketball"
            ? "Basketball"
            : "Texas Hold'em";

  return `${gameTypeName} on ${date}`;
}

async function touchGame(supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"], gameId: string) {
  const { error } = await supabase
    .from("games")
    .update({})
    .eq("id", gameId);

  if (error) {
    throw new Error(error.message);
  }
}

async function getOrCreateFamilyId(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  familyName: string | null | undefined,
) {
  const normalizedFamilyName = familyName?.trim() ?? "";

  if (!normalizedFamilyName) {
    return null;
  }

  const { data: existingFamily, error: existingError } = await supabase
    .from("families")
    .select("id, name")
    .ilike("name", normalizedFamilyName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingFamily) {
    return existingFamily.id;
  }

  const { data: createdFamily, error: createError } = await supabase
    .from("families")
    .insert({ name: normalizedFamilyName })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdFamily.id;
}

async function requireGame(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  gameId: string,
) {
  const { data, error } = await supabase
    .from("games")
    .select("id, game_type_id, display_name, point_basis, money_per_point_cents, status")
    .eq("id", gameId)
    .single<GameRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function requireGamePlayer(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  gamePlayerId: string,
) {
  const { data, error } = await supabase
    .from("game_players")
    .select("id, game_id, player_id, join_order, is_locked")
    .eq("id", gamePlayerId)
    .single<GamePlayerRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function minimizeTransfers(
  units: Array<{ id: string; label: string; amountCents: number }>,
) {
  const debtors = units
    .filter((unit) => unit.amountCents < 0)
    .map((unit) => ({
      id: unit.id,
      label: unit.label,
      remainingCents: Math.abs(unit.amountCents),
    }))
    .sort((left, right) => right.remainingCents - left.remainingCents);
  const creditors = units
    .filter((unit) => unit.amountCents > 0)
    .map((unit) => ({
      id: unit.id,
      label: unit.label,
      remainingCents: unit.amountCents,
    }))
    .sort((left, right) => right.remainingCents - left.remainingCents);

  const transfers: Array<{
    fromUnitId: string;
    toUnitId: string;
    amountCents: number;
  }> = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remainingCents, creditor.remainingCents);

    transfers.push({
      fromUnitId: debtor.id,
      toUnitId: creditor.id,
      amountCents,
    });

    debtor.remainingCents -= amountCents;
    creditor.remainingCents -= amountCents;

    if (debtor.remainingCents === 0) {
      debtorIndex += 1;
    }

    if (creditor.remainingCents === 0) {
      creditorIndex += 1;
    }
  }

  return transfers;
}

const RESERVED_DISPLAY_NAME = "Deleted Player";

async function handleCreatePlayer(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "create_player" }>,
) {
  const name = action.displayName.trim();
  if (name.toLowerCase() === RESERVED_DISPLAY_NAME.toLowerCase()) {
    throw new Error(`"${RESERVED_DISPLAY_NAME}" is a reserved name.`);
  }

  const familyId = await getOrCreateFamilyId(supabase, action.familyName);

  const { data, error } = await supabase
    .from("players")
    .insert({
      display_name: action.displayName.trim(),
      family_id: familyId,
    })
    .select("id, display_name, family_id")
    .single<PlayerRow>();

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(supabase, "create_player", "player", String(data.id), {
    display_name: data.display_name,
    family_id: data.family_id,
  });

  return jsonResponse({ player: data }, 201);
}

async function handleRenamePlayer(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "rename_player" }>,
) {
  const name = action.displayName.trim();
  if (name.toLowerCase() === RESERVED_DISPLAY_NAME.toLowerCase()) {
    throw new Error(`"${RESERVED_DISPLAY_NAME}" is a reserved name.`);
  }

  const { data, error } = await supabase
    .from("players")
    .update({
      display_name: name,
    })
    .eq("id", action.playerId)
    .select("id, display_name, family_id")
    .single<PlayerRow>();

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(supabase, "rename_player", "player", String(data.id), {
    display_name: data.display_name,
  });

  return jsonResponse({ player: data });
}

async function handleSetPlayerFamily(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "set_player_family" }>,
) {
  const familyId = await getOrCreateFamilyId(supabase, action.familyName);
  const { data, error } = await supabase
    .from("players")
    .update({
      family_id: familyId,
    })
    .eq("id", action.playerId)
    .select("id, display_name, family_id")
    .single<PlayerRow>();

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(
    supabase,
    "set_player_family",
    "player",
    String(action.playerId),
    {
      family_id: familyId,
      family_name: action.familyName?.trim() || null,
    },
  );

  return jsonResponse({ player: data });
}

async function handleDeletePlayer(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "delete_player" }>,
) {
  const { data, error } = await supabase
    .from("players")
    .update({ is_active: false })
    .eq("id", action.playerId)
    .select("id, display_name")
    .single<PlayerRow>();

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(supabase, "delete_player", "player", String(data.id), {
    display_name: data.display_name,
  });

  return jsonResponse({ player: data });
}

async function handleCreateGame(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "create_game" }>,
) {
  const displayName =
    action.displayName?.trim() || formatDefaultGameName(action.gameTypeId);

  const pointBasis =
    action.gameTypeId === "dixit" || action.gameTypeId === "basketball"
      ? 1
      : action.pointBasis;

  const { data, error } = await supabase
    .from("games")
    .insert({
      game_type_id: action.gameTypeId,
      display_name: displayName,
      point_basis: pointBasis,
      money_per_point_cents: action.moneyPerPointCents,
    })
    .select("id, game_type_id, display_name, point_basis, money_per_point_cents, status")
    .single<GameRow>();

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(supabase, "create_game", "game", data.id, {
    display_name: data.display_name,
    game_type_id: data.game_type_id,
    point_basis: data.point_basis,
    money_per_point_cents: data.money_per_point_cents,
  });

  return jsonResponse({ game: data }, 201);
}

async function handleAddPlayersToGame(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "add_players_to_game" }>,
) {
  const game = await requireGame(supabase, action.gameId);

  if (game.status !== "open") {
    throw new Error("Cannot add players to a settled game.");
  }

  const uniquePlayerIds = Array.from(new Set(action.playerIds));
  const { data: existingRows, error: existingError } = await supabase
    .from("game_players")
    .select("id, player_id, join_order")
    .eq("game_id", action.gameId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingPlayerIds = new Set(
    (existingRows ?? []).map((row) => row.player_id as number),
  );
  const currentMaxJoinOrder = (existingRows ?? []).reduce(
    (max, row) => Math.max(max, row.join_order as number),
    0,
  );

  const rowsToInsert = uniquePlayerIds
    .filter((playerId) => !existingPlayerIds.has(playerId))
    .map((playerId, index) => ({
      game_id: action.gameId,
      player_id: playerId,
      join_order: currentMaxJoinOrder + index + 1,
    }));

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("game_players").insert(rowsToInsert);

    if (error) {
      throw new Error(error.message);
    }
  }

  await touchGame(supabase, action.gameId);
  await insertAuditLog(
    supabase,
    "add_players_to_game",
    "game",
    action.gameId,
    {
      added_player_ids: rowsToInsert.map((row) => row.player_id),
    },
  );

  return jsonResponse({
    addedPlayerIds: rowsToInsert.map((row) => row.player_id),
  });
}

async function handleUpdateGameSettings(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "update_game_settings" }>,
) {
  const game = await requireGame(supabase, action.gameId);

  if (game.status !== "open") {
    throw new Error("Cannot edit settings after settlement. Undo settlement first.");
  }

  const pointBasis =
    game.game_type_id === "dixit" || game.game_type_id === "basketball"
      ? 1
      : action.pointBasis;

  const { data, error } = await supabase
    .from("games")
    .update({
      display_name: action.displayName.trim(),
      point_basis: pointBasis,
      money_per_point_cents: action.moneyPerPointCents,
    })
    .eq("id", action.gameId)
    .select("id, game_type_id, display_name, point_basis, money_per_point_cents, status")
    .single<GameRow>();

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(
    supabase,
    "update_game_settings",
    "game",
    action.gameId,
    {
      display_name: data.display_name,
      point_basis: data.point_basis,
      money_per_point_cents: data.money_per_point_cents,
    },
  );

  return jsonResponse({ game: data });
}

async function handleToggleGamePlayerLock(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "toggle_game_player_lock" }>,
) {
  const game = await requireGame(supabase, action.gameId);
  const gamePlayer = await requireGamePlayer(supabase, action.gamePlayerId);

  if (gamePlayer.game_id !== action.gameId) {
    throw new Error("Game player does not belong to the selected game.");
  }

  const { data, error } = await supabase
    .from("game_players")
    .update({ is_locked: action.isLocked })
    .eq("id", action.gamePlayerId)
    .select("id, game_id, player_id, join_order, is_locked")
    .single<GamePlayerRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (game.status === "open") {
    await touchGame(supabase, action.gameId);
  }

  await insertAuditLog(
    supabase,
    "toggle_game_player_lock",
    "game_player",
    action.gamePlayerId,
    {
      is_locked: data.is_locked,
    },
  );

  return jsonResponse({ gamePlayer: data });
}

async function handleRemoveGamePlayer(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "remove_game_player" }>,
) {
  const gamePlayer = await requireGamePlayer(supabase, action.gamePlayerId);

  if (gamePlayer.game_id !== action.gameId) {
    throw new Error("Game player does not belong to the selected game.");
  }

  const { count: roundEntryCount, error: roundEntryError } = await supabase
    .from("round_entries")
    .select("id", { count: "exact", head: true })
    .eq("game_player_id", action.gamePlayerId);

  if (roundEntryError) {
    throw new Error(roundEntryError.message);
  }

  if ((roundEntryCount ?? 0) > 0) {
    throw new Error("Cannot remove a player who already appears in round history.");
  }

  const { count: settlementCount, error: settlementError } = await supabase
    .from("money_settlement_players")
    .select("id", { count: "exact", head: true })
    .eq("player_id", gamePlayer.player_id);

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  if ((settlementCount ?? 0) > 0) {
    throw new Error("Cannot remove a player who is already part of a settlement.");
  }

  const { error } = await supabase
    .from("game_players")
    .delete()
    .eq("id", action.gamePlayerId);

  if (error) {
    throw new Error(error.message);
  }

  await touchGame(supabase, action.gameId);
  await insertAuditLog(
    supabase,
    "remove_game_player",
    "game_player",
    action.gamePlayerId,
    {
      player_id: gamePlayer.player_id,
    },
  );

  return jsonResponse({ removedGamePlayerId: action.gamePlayerId });
}

async function handleDeleteGame(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "delete_game" }>,
) {
  await insertAuditLog(supabase, "delete_game", "game", action.gameId, {});

  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", action.gameId);

  if (error) {
    throw new Error(error.message);
  }

  return jsonResponse({ deletedGameId: action.gameId });
}

async function handleCreateRound(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "create_round" }>,
) {
  const game = await requireGame(supabase, action.gameId);

  if (game.status !== "open") {
    throw new Error("Cannot add a round to a settled game.");
  }

  if (game.game_type_id !== action.gameTypeId) {
    throw new Error("Round game type does not match the game.");
  }

  const entryTotal = action.entries.reduce(
    (sum, entry) => sum + entry.pointDelta,
    0,
  );

  if (Math.abs(entryTotal) > 0.01) {
    throw new Error("Round entries must sum to zero.");
  }

  const { data: gamePlayers, error: gamePlayersError } = await supabase
    .from("game_players")
    .select("id, game_id, player_id, join_order, is_locked")
    .eq("game_id", action.gameId)
    .order("join_order", { ascending: true });

  if (gamePlayersError) {
    throw new Error(gamePlayersError.message);
  }

  const unlockedGamePlayers = (gamePlayers ?? []).filter(
    (row) => !row.is_locked,
  ) as GamePlayerRow[];
  const entryPlayerIds = action.entries.map((entry) => entry.playerId);
  const uniqueEntryPlayerIds = new Set(entryPlayerIds);

  if (uniqueEntryPlayerIds.size !== action.entries.length) {
    throw new Error("Round entries must not repeat players.");
  }

  const unlockedPlayerIds = new Set(
    unlockedGamePlayers.map((gamePlayer) => gamePlayer.player_id),
  );

  if (action.gameTypeId === "basketball") {
    for (const entryPlayerId of uniqueEntryPlayerIds) {
      if (!unlockedPlayerIds.has(entryPlayerId)) {
        throw new Error("Round entry references a non-participating player.");
      }
    }

    const metadata = action.metadata as Record<string, unknown> | undefined;
    const teamAPlayerIdsRaw = metadata?.teamAPlayerIds;
    const teamBPlayerIdsRaw = metadata?.teamBPlayerIds;

    const teamAPlayerIds = Array.isArray(teamAPlayerIdsRaw)
      ? teamAPlayerIdsRaw
      : [];
    const teamBPlayerIds = Array.isArray(teamBPlayerIdsRaw)
      ? teamBPlayerIdsRaw
      : [];

    if (teamAPlayerIds.length < 1 || teamBPlayerIds.length < 1) {
      throw new Error("Basketball rounds require at least one player on each team.");
    }

    const teamASet = new Set<number>();
    const teamBSet = new Set<number>();

    for (const id of teamAPlayerIds) {
      if (!Number.isInteger(id)) {
        throw new Error("Basketball team metadata must use integer player ids.");
      }
      if (!unlockedPlayerIds.has(id as number)) {
        throw new Error("Basketball team metadata references a locked or missing player.");
      }
      teamASet.add(id as number);
    }

    for (const id of teamBPlayerIds) {
      if (!Number.isInteger(id)) {
        throw new Error("Basketball team metadata must use integer player ids.");
      }
      if (!unlockedPlayerIds.has(id as number)) {
        throw new Error("Basketball team metadata references a locked or missing player.");
      }
      teamBSet.add(id as number);
    }

    for (const id of teamASet) {
      if (teamBSet.has(id)) {
        throw new Error("Basketball team metadata cannot place one player on both teams.");
      }
    }

    const roster = new Set<number>([...teamASet, ...teamBSet]);
    if (roster.size !== uniqueEntryPlayerIds.size) {
      throw new Error("Basketball entries must match team assignments exactly.");
    }
    for (const id of roster) {
      if (!uniqueEntryPlayerIds.has(id)) {
        throw new Error("Basketball entries must match team assignments exactly.");
      }
    }
  } else {
    if (unlockedGamePlayers.length !== action.entries.length) {
      throw new Error(
        "Round entries must include every unlocked player in the game exactly once.",
      );
    }
    for (const gamePlayer of unlockedGamePlayers) {
      if (!uniqueEntryPlayerIds.has(gamePlayer.player_id)) {
        throw new Error(
          "Round entries must include every unlocked player in the game exactly once.",
        );
      }
    }
  }

  const { data: existingRounds, error: existingRoundsError } = await supabase
    .from("rounds")
    .select("round_number")
    .eq("game_id", action.gameId)
    .order("round_number", { ascending: false })
    .limit(1);

  if (existingRoundsError) {
    throw new Error(existingRoundsError.message);
  }

  const nextRoundNumber = (existingRounds?.[0]?.round_number ?? 0) + 1;

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      game_id: action.gameId,
      round_number: nextRoundNumber,
      game_type_id: action.gameTypeId,
      settings_snapshot: {
        pointBasis: game.point_basis,
        moneyPerPointCents: game.money_per_point_cents,
        metadata: action.metadata ?? {},
      },
      summary_text: action.summaryText,
    })
    .select("id, round_number")
    .single<{ id: string; round_number: number }>();

  if (roundError) {
    throw new Error(roundError.message);
  }

  const gamePlayerByPlayerId = new Map(
    unlockedGamePlayers.map((gamePlayer) => [gamePlayer.player_id, gamePlayer]),
  );
  const roundEntries = action.entries.map((entry) => {
    const gamePlayer = gamePlayerByPlayerId.get(entry.playerId);

    if (!gamePlayer) {
      throw new Error("Round entry references a non-participating player.");
    }

    return {
      round_id: round.id,
      game_id: action.gameId,
      game_player_id: gamePlayer.id,
      player_id: entry.playerId,
      point_delta: entry.pointDelta,
      metadata: action.metadata ?? {},
    };
  });

  const { error: roundEntriesError } = await supabase
    .from("round_entries")
    .insert(roundEntries);

  if (roundEntriesError) {
    throw new Error(roundEntriesError.message);
  }

  await touchGame(supabase, action.gameId);
  await insertAuditLog(supabase, "create_round", "round", round.id, {
    game_id: action.gameId,
    round_number: round.round_number,
    summary_text: action.summaryText,
  });

  return jsonResponse({ roundId: round.id, roundNumber: round.round_number }, 201);
}

async function handleDeleteRound(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "delete_round" }>,
) {
  const { count: settlementCount, error: settlementError } = await supabase
    .from("money_settlements")
    .select("id", { count: "exact", head: true })
    .eq("game_id", action.gameId);

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  if ((settlementCount ?? 0) > 0) {
    throw new Error("Undo settlement before deleting rounds from this game.");
  }

  await insertAuditLog(supabase, "delete_round", "round", action.roundId, {
    game_id: action.gameId,
  });

  const { error } = await supabase
    .from("rounds")
    .delete()
    .eq("id", action.roundId)
    .eq("game_id", action.gameId);

  if (error) {
    throw new Error(error.message);
  }

  await touchGame(supabase, action.gameId);

  return jsonResponse({ deletedRoundId: action.roundId });
}

async function handleCalculateSettlement(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "calculate_settlement" }>,
) {
  const game = await requireGame(supabase, action.gameId);

  if (game.status !== "open") {
    throw new Error("Settlement already exists for this game.");
  }

  const { data: totals, error: totalsError } = await supabase
    .from("game_point_totals")
    .select("game_id, game_player_id, player_id, point_total")
    .eq("game_id", action.gameId);

  if (totalsError) {
    throw new Error(totalsError.message);
  }

  const typedTotals = (totals ?? []) as GamePointTotalRow[];

  if (typedTotals.length === 0) {
    throw new Error("Cannot settle a game with no players.");
  }

  const isZeroMoneySettlement = game.money_per_point_cents === 0;

  if (!isZeroMoneySettlement) {
    const totalPoints = typedTotals.reduce(
      (sum, total) => sum + Number(total.point_total),
      0,
    );

    if (Math.abs(totalPoints) > 0.01) {
      throw new Error("Game totals must sum to zero before settlement.");
    }
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, display_name, family_id")
    .in(
      "id",
      typedTotals.map((row) => row.player_id),
    );

  if (playersError) {
    throw new Error(playersError.message);
  }

  const typedPlayers = (players ?? []) as PlayerRow[];
  const playerById = new Map(typedPlayers.map((player) => [player.id, player]));

  const { data: families, error: familiesError } = await supabase
    .from("families")
    .select("id, name");

  if (familiesError) {
    throw new Error(familiesError.message);
  }

  const familyById = new Map(
    (families ?? []).map((family) => [family.id as string, family.name as string]),
  );

  let perPlayerImpacts: Array<{
    playerId: number;
    amountCents: number;
    displayName: string;
    familyId: string | null;
  }>;
  let groupedUnits: Array<{
    id: string;
    label: string;
    amountCents: number;
    playerIds: number[];
  }>;
  let transfersForInsert: ReturnType<typeof minimizeTransfers> = [];
  let groupedUnitsMapForTransfers: Map<
    string,
    { id: string; label: string; amountCents: number; playerIds: number[] }
  > = new Map();

  if (isZeroMoneySettlement) {
    perPlayerImpacts = typedTotals.map((row) => ({
      playerId: row.player_id,
      amountCents: 0,
      displayName: playerById.get(row.player_id)?.display_name ?? String(row.player_id),
      familyId: playerById.get(row.player_id)?.family_id ?? null,
    }));
    groupedUnits = [];
  } else {
    const moneyPerPoint = game.money_per_point_cents;
    const rawAmounts = typedTotals.map((row) => {
      const pointTotal = Number(row.point_total);
      const rawCents = pointTotal * moneyPerPoint;
      return {
        playerId: row.player_id,
        rawCents,
        displayName: playerById.get(row.player_id)?.display_name ?? String(row.player_id),
        familyId: playerById.get(row.player_id)?.family_id ?? null,
      };
    });

    const roundedCents = rawAmounts.map((r) => Math.round(r.rawCents));
    let sumRounded = roundedCents.reduce((s, c) => s + c, 0);

    if (sumRounded !== 0) {
      const indexed = rawAmounts
        .map((r, i) => ({
          index: i,
          rawCents: r.rawCents,
          rounded: roundedCents[i],
          fractionalError: Math.abs(r.rawCents - Math.round(r.rawCents)),
        }))
        .sort((a, b) => b.fractionalError - a.fractionalError);

      for (const { index } of indexed) {
        if (sumRounded === 0) break;
        const adjust = sumRounded > 0 ? -1 : 1;
        roundedCents[index] += adjust;
        sumRounded += adjust;
      }
    }

    perPlayerImpacts = rawAmounts.map((r, i) => ({
      playerId: r.playerId,
      amountCents: roundedCents[i],
      displayName: r.displayName,
      familyId: r.familyId,
    }));

    const groupedUnitsMap = new Map<
      string,
      {
        id: string;
        label: string;
        amountCents: number;
        playerIds: number[];
      }
    >();

    for (const playerImpact of perPlayerImpacts) {
      const groupedKey = playerImpact.familyId
        ? `family:${playerImpact.familyId}`
        : `player:${playerImpact.playerId}`;
      const existingUnit = groupedUnitsMap.get(groupedKey);

      if (existingUnit) {
        existingUnit.amountCents += playerImpact.amountCents;
        existingUnit.playerIds.push(playerImpact.playerId);
        continue;
      }

      groupedUnitsMap.set(groupedKey, {
        id: groupedKey,
        label: playerImpact.familyId
          ? familyById.get(playerImpact.familyId) ?? `Family ${playerImpact.familyId}`
          : playerImpact.displayName,
        amountCents: playerImpact.amountCents,
        playerIds: [playerImpact.playerId],
      });
    }

    groupedUnits = Array.from(groupedUnitsMap.values()).filter(
      (unit) => unit.amountCents !== 0,
    );
    transfersForInsert = minimizeTransfers(groupedUnits);
    groupedUnitsMapForTransfers = groupedUnitsMap;
  }

  const { data: settlement, error: settlementError } = await supabase
    .from("money_settlements")
    .insert({
      game_id: action.gameId,
      point_basis: game.point_basis,
      money_per_point_cents: game.money_per_point_cents,
      grouped_units: groupedUnits,
      totals_snapshot: perPlayerImpacts,
    })
    .select("id")
    .single<{ id: string }>();

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  const { error: playerImpactsError } = await supabase
    .from("money_settlement_players")
    .insert(
      perPlayerImpacts.map((impact) => ({
        settlement_id: settlement.id,
        player_id: impact.playerId,
        amount_cents: impact.amountCents,
      })),
    );

  if (playerImpactsError) {
    throw new Error(playerImpactsError.message);
  }

  if (!isZeroMoneySettlement && transfersForInsert.length > 0) {
    const transferRows = transfersForInsert.map((transfer) => {
      const fromUnit = groupedUnitsMapForTransfers.get(transfer.fromUnitId);
      const toUnit = groupedUnitsMapForTransfers.get(transfer.toUnitId);

      if (!fromUnit || !toUnit) {
        throw new Error("Settlement unit lookup failed.");
      }

      return {
        settlement_id: settlement.id,
        from_player_id: fromUnit.playerIds.length === 1 ? fromUnit.playerIds[0] : null,
        to_player_id: toUnit.playerIds.length === 1 ? toUnit.playerIds[0] : null,
        family_label:
          fromUnit.playerIds.length > 1 || toUnit.playerIds.length > 1
            ? `${fromUnit.label} -> ${toUnit.label}`
            : null,
        amount_cents: transfer.amountCents,
      };
    });

    const { error: transfersError } = await supabase
      .from("money_transfers")
      .insert(transferRows);

    if (transfersError) {
      throw new Error(transfersError.message);
    }
  }

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({
      status: "settled",
      ended_at: new Date().toISOString(),
    })
    .eq("id", action.gameId);

  if (gameUpdateError) {
    throw new Error(gameUpdateError.message);
  }

  const transferCount = isZeroMoneySettlement ? 0 : transfersForInsert.length;
  await insertAuditLog(
    supabase,
    "calculate_settlement",
    "money_settlement",
    settlement.id,
    {
      game_id: action.gameId,
      transfers: transferCount,
    },
  );

  return jsonResponse({
    settlementId: settlement.id,
    groupedUnits,
    transfers: isZeroMoneySettlement ? [] : transfersForInsert,
    perPlayerImpacts,
  });
}

async function handleUndoSettlement(
  supabase: Awaited<ReturnType<typeof createVerifiedAdminClient>>["supabase"],
  action: Extract<AdminAction, { action: "undo_settlement" }>,
) {
  const { data: settlement, error: settlementError } = await supabase
    .from("money_settlements")
    .select("id")
    .eq("game_id", action.gameId)
    .maybeSingle<{ id: string }>();

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  if (!settlement) {
    throw new Error("No settlement exists for this game.");
  }

  await insertAuditLog(
    supabase,
    "undo_settlement",
    "money_settlement",
    settlement.id,
    {
      game_id: action.gameId,
    },
  );

  const { error } = await supabase
    .from("money_settlements")
    .delete()
    .eq("id", settlement.id);

  if (error) {
    throw new Error(error.message);
  }

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({
      status: "open",
      ended_at: null,
    })
    .eq("id", action.gameId);

  if (gameUpdateError) {
    throw new Error(gameUpdateError.message);
  }

  return jsonResponse({ undoneSettlementId: settlement.id });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  try {
    const rawPayload = await request.json();
    const action = actionSchema.parse(rawPayload);
    const { supabase } = await createVerifiedAdminClient(action);

    switch (action.action) {
      case "create_player":
        return await handleCreatePlayer(supabase, action);
      case "rename_player":
        return await handleRenamePlayer(supabase, action);
      case "set_player_family":
        return await handleSetPlayerFamily(supabase, action);
      case "delete_player":
        return await handleDeletePlayer(supabase, action);
      case "create_game":
        return await handleCreateGame(supabase, action);
      case "add_players_to_game":
        return await handleAddPlayersToGame(supabase, action);
      case "update_game_settings":
        return await handleUpdateGameSettings(supabase, action);
      case "toggle_game_player_lock":
        return await handleToggleGamePlayerLock(supabase, action);
      case "remove_game_player":
        return await handleRemoveGamePlayer(supabase, action);
      case "delete_game":
        return await handleDeleteGame(supabase, action);
      case "create_round":
        return await handleCreateRound(supabase, action);
      case "delete_round":
        return await handleDeleteRound(supabase, action);
      case "calculate_settlement":
        return await handleCalculateSettlement(supabase, action);
      case "undo_settlement":
        return await handleUndoSettlement(supabase, action);
      default:
        return jsonResponse({ error: "Unsupported action" }, 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return invalidRequestResponse(error);
    }

    if (error instanceof Error && error.name === "UnauthorizedError") {
      return unauthorizedResponse();
    }

    return serverErrorResponse(error);
  }
});
