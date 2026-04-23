import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAdminSession } from "../features/admin/AdminSessionContext";
import { calculateDixitRound } from "../features/game-types/dixit";
import { calculateFightTheLandlordRound } from "../features/game-types/fightTheLandlord";
import { getGameTypeOption } from "../features/game-types";
import { calculateTexasHoldemRound } from "../features/game-types/texasHoldem";
import {
  type WerewolfTeamId,
  WEREWOLF_TEAMS,
  calculateWerewolvesRound,
} from "../features/game-types/werewolves";
import {
  DEFAULT_BASKETBALL_LEDGER_SCALE,
  calculateBasketballRound,
  priorBasketballMatchesFromRoundSnapshots,
} from "../features/game-types/basketball";
import {
  PlayerSortButtons,
  useSortedPlayers,
} from "../features/players/SortablePlayerList";
import { adminWrite } from "../lib/api/admin";
import { fetchGameDetails, fetchPlayers } from "../lib/api/read";
import { formatDateTime, formatMoneyCents, formatPoints } from "../lib/format";

function sumPointTotals(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

export function GameViewPage() {
  const { gameId = "" } = useParams();
  const queryClient = useQueryClient();
  const { isAdmin, password } = useAdminSession();
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [createPlayerValues, setCreatePlayerValues] = useState({
    displayName: "",
    familyName: "",
  });
  const [settingsValues, setSettingsValues] = useState({
    displayName: "",
    pointBasis: "1",
    moneyPerPointCents: "0",
  });
  const [texasPointInputs, setTexasPointInputs] = useState<Record<number, string>>(
    {},
  );
  const [dixitPointInputs, setDixitPointInputs] = useState<Record<number, string>>(
    {},
  );
  const [landlordValues, setLandlordValues] = useState({
    outcome: "won" as "won" | "lost",
    gameMultiplier: 1,
    numBombs: 0,
    selections: {} as Record<number, number>,
  });
  const [ftlQuickFillMode, setFtlQuickFillMode] = useState(false);
  const [ftlQuickFillInputs, setFtlQuickFillInputs] = useState<
    Record<number, string>
  >({});
  const [werewolfValues, setWerewolfValues] = useState<{
    playerTeams: Record<number, WerewolfTeamId>;
    survivedIds: number[];
    winningTeamIds: WerewolfTeamId[];
  }>({
    playerTeams: {},
    survivedIds: [],
    winningTeamIds: [],
  });
  const [basketballTeamByPlayerId, setBasketballTeamByPlayerId] = useState<
    Record<number, "none" | "A" | "B">
  >({});
  const [basketballScores, setBasketballScores] = useState({
    teamA: "",
    teamB: "",
  });

  const clampToTwoDecimals = (value: number) =>
    Math.round(value * 100) / 100;

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGameDetails(gameId),
    enabled: Boolean(gameId),
  });
  const playersQuery = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  const game = gameQuery.data;
  const allPlayers = playersQuery.data ?? [];
  const currentGamePlayerIds = new Set(game?.players.map((player) => player.playerId) ?? []);
  const availablePlayers = allPlayers.filter(
    (player) => !currentGamePlayerIds.has(player.id),
  );
  const unlockedPlayers = game?.players.filter((player) => !player.isLocked) ?? [];

  const [sortedAvailablePlayers, addPlayersSort, setAddPlayersSort] =
    useSortedPlayers(availablePlayers);
  const [sortedGamePlayers, gamePlayersSort, setGamePlayersSort] =
    useSortedPlayers(game?.players ?? [], "id");
  const [sortedUnlockedPlayers, unlockedSort, setUnlockedSort] =
    useSortedPlayers(unlockedPlayers);

  const basketballRosterKey = useMemo(
    () =>
      [...sortedUnlockedPlayers.map((player) => player.playerId)].sort(
        (a, b) => a - b,
      ).join(","),
    [sortedUnlockedPlayers],
  );

  useEffect(() => {
    if (!game || game.gameTypeId !== "basketball" || !showRoundForm) {
      return;
    }

    const ids = basketballRosterKey
      ? basketballRosterKey.split(",").map((id) => Number(id))
      : [];

    if (ids.length < 2) {
      return;
    }

    const next: Record<number, "none" | "A" | "B"> = {};
    ids.forEach((id) => {
      next[id] = "none";
    });
    setBasketballTeamByPlayerId(next);
  }, [game?.gameTypeId, showRoundForm, basketballRosterKey]);

  const invalidateGameData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["games"] }),
      queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
      queryClient.invalidateQueries({ queryKey: ["players"] }),
      queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
    ]);
  };

  const requireAdminPassword = () => {
    if (!password) {
      throw new Error("Admin session has expired. Please log in again.");
    }

    return password;
  };

  const createPlayerMutation = useMutation({
    mutationFn: async () =>
      adminWrite({
        action: "create_player",
        password: requireAdminPassword(),
        displayName: createPlayerValues.displayName,
        familyName: createPlayerValues.familyName || null,
      }),
    onSuccess: async () => {
      setCreatePlayerValues({ displayName: "", familyName: "" });
      await invalidateGameData();
    },
  });

  const addPlayersMutation = useMutation({
    mutationFn: async () =>
      adminWrite({
        action: "add_players_to_game",
        password: requireAdminPassword(),
        gameId,
        playerIds: selectedPlayerIds,
      }),
    onSuccess: async () => {
      setSelectedPlayerIds([]);
      setShowAddPlayers(false);
      await invalidateGameData();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async () =>
      adminWrite({
        action: "update_game_settings",
        password: requireAdminPassword(),
        gameId,
        displayName: settingsValues.displayName,
        pointBasis:
          game?.gameTypeId === "dixit" || game?.gameTypeId === "basketball"
            ? 1
            : Number(settingsValues.pointBasis),
        moneyPerPointCents: Number(settingsValues.moneyPerPointCents),
      }),
    onSuccess: async () => {
      setShowGameSettings(false);
      await invalidateGameData();
    },
  });

  const togglePlayerLockMutation = useMutation({
    mutationFn: async ({
      gamePlayerId,
      isLocked,
    }: {
      gamePlayerId: string;
      isLocked: boolean;
    }) =>
      adminWrite({
        action: "toggle_game_player_lock",
        password: requireAdminPassword(),
        gameId,
        gamePlayerId,
        isLocked,
      }),
    onSuccess: async () => {
      await invalidateGameData();
    },
  });

  const removeGamePlayerMutation = useMutation({
    mutationFn: async (gamePlayerId: string) =>
      adminWrite({
        action: "remove_game_player",
        password: requireAdminPassword(),
        gameId,
        gamePlayerId,
      }),
    onSuccess: async () => {
      await invalidateGameData();
    },
  });

  const createRoundMutation = useMutation({
    mutationFn: async ({
      entries,
      summaryText,
      metadata,
    }: {
      entries: Array<{ playerId: number; pointDelta: number }>;
      summaryText: string;
      metadata?: Record<string, unknown>;
    }) =>
      adminWrite({
        action: "create_round",
        password: requireAdminPassword(),
        gameId,
        gameTypeId: game?.gameTypeId,
        entries,
        summaryText,
        metadata,
      }),
    onSuccess: async () => {
      setShowRoundForm(false);
      setTexasPointInputs({});
      setDixitPointInputs({});
      setLandlordValues({
        outcome: "won",
        gameMultiplier: 1,
        numBombs: 0,
        selections: {},
      });
      setWerewolfValues({
        playerTeams: {},
        survivedIds: [],
        winningTeamIds: [],
      });
      await invalidateGameData();
    },
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (roundId: string) =>
      adminWrite({
        action: "delete_round",
        password: requireAdminPassword(),
        gameId,
        roundId,
      }),
    onSuccess: async () => {
      await invalidateGameData();
    },
  });

  const calculateSettlementMutation = useMutation({
    mutationFn: async () =>
      adminWrite<"calculate_settlement", { transfers: Array<{ fromUnitId: string; toUnitId: string; amountCents: number }> }>({
        action: "calculate_settlement",
        password: requireAdminPassword(),
        gameId,
      }),
    onSuccess: async () => {
      await invalidateGameData();
    },
  });

  const undoSettlementMutation = useMutation({
    mutationFn: async () =>
      adminWrite({
        action: "undo_settlement",
        password: requireAdminPassword(),
        gameId,
      }),
    onSuccess: async () => {
      await invalidateGameData();
    },
  });

  const totalPoints = useMemo(
    () => sumPointTotals((game?.players ?? []).map((player) => player.total)),
    [game?.players],
  );

  useEffect(() => {
    if (!game || showGameSettings) {
      return;
    }

    setSettingsValues({
      displayName: game.displayName,
      pointBasis: String(game.pointBasis),
      moneyPerPointCents: String(game.moneyPerPointCents),
    });
  }, [game, showGameSettings]);

  if (gameQuery.isLoading) {
    return <section className="card stack-sm"><p className="muted">Loading game...</p></section>;
  }

  if (gameQuery.error || !game) {
    return (
      <section className="card stack-sm">
        <p className="form-error">
          {gameQuery.error?.message ?? "Unable to load this game."}
        </p>
        <Link to="/" className="secondary-button link-button">
          Back to games
        </Link>
      </section>
    );
  }

  async function handleTexasHoldemRoundSubmit() {
    const entries = unlockedPlayers.map((player) => {
      const raw = Number(texasPointInputs[player.playerId] ?? 0);
      return {
        playerId: player.playerId,
        pointDelta: clampToTwoDecimals(raw),
      };
    });
    const result = calculateTexasHoldemRound({ entries });

    const roundedTotal = clampToTwoDecimals(result.total);

    if (Math.abs(roundedTotal) > 0.01) {
      const shouldContinue = window.confirm(
        `This round totals ${roundedTotal}. Continue anyway?`,
      );

      if (!shouldContinue) {
        return;
      }
    }

    const summaryText = unlockedPlayers
      .map((player) => {
        const pointDelta = entries.find(
          (entry) => entry.playerId === player.playerId,
        )?.pointDelta ?? 0;

        return `${player.displayName} ${
          pointDelta > 0 ? "+" : ""
        }${clampToTwoDecimals(pointDelta)}`;
      })
      .join(", ");

    await createRoundMutation.mutateAsync({
      entries,
      summaryText,
      metadata: {
        mode: "texas-holdem",
      },
    });
  }

  async function handleDixitRoundSubmit() {
    const entries = unlockedPlayers.map((player) => ({
      playerId: player.playerId,
      pointDelta: clampToTwoDecimals(
        Number(dixitPointInputs[player.playerId] ?? 0),
      ),
      joinOrder: player.joinOrder,
    }));
    const result = calculateDixitRound({ entries });
    const outbound = result.entries.map((entry) => ({
      playerId: Number(entry.playerId),
      pointDelta: clampToTwoDecimals(entry.pointDelta),
    }));
    const byPlayerId = new Map(
      outbound.map((entry) => [entry.playerId, entry.pointDelta]),
    );
    const summaryText = [...unlockedPlayers]
      .sort((a, b) => a.joinOrder - b.joinOrder)
      .map((player) => {
        const pointDelta = byPlayerId.get(player.playerId) ?? 0;
        const rounded = clampToTwoDecimals(pointDelta);
        return `${player.displayName} ${rounded > 0 ? "+" : ""}${rounded}`;
      })
      .join(", ");

    await createRoundMutation.mutateAsync({
      entries: outbound,
      summaryText,
      metadata: {
        mode: "dixit",
        rawEntries: entries,
      },
    });
  }

  async function handleFightTheLandlordRoundSubmit() {
    const currentGame = game;

    if (!currentGame) {
      return;
    }

    const activePlayerIds = unlockedPlayers.map((player) =>
      String(player.playerId),
    );
    const landlordSideSelections: string[] = [];
    for (const player of unlockedPlayers) {
      const count = landlordValues.selections[player.playerId] ?? 0;
      for (let i = 0; i < count; i += 1) {
        landlordSideSelections.push(String(player.playerId));
      }
    }

    if (landlordSideSelections.length === 0) {
      window.alert("Select at least one landlord-side selection.");
      return;
    }

    const result = calculateFightTheLandlordRound({
      activePlayerIds,
      landlordSideSelections,
      outcome: landlordValues.outcome,
      pointBasis: currentGame.pointBasis,
      numBombs: landlordValues.numBombs,
      gameMultiplier: landlordValues.gameMultiplier,
    });

    const playerNameById = new Map(
      unlockedPlayers.map((player) => [String(player.playerId), player.displayName]),
    );
    const entries = result.entries.map((entry) => ({
      playerId: Number(entry.playerId),
      pointDelta: entry.pointDelta,
    }));
    const summaryText = entries
      .map((entry) => {
        const displayName = playerNameById.get(String(entry.playerId)) ?? entry.playerId;
        return `${displayName} ${entry.pointDelta > 0 ? "+" : ""}${entry.pointDelta}`;
      })
      .join(", ");

    await createRoundMutation.mutateAsync({
      entries,
      summaryText,
      metadata: {
        mode: "fight-the-landlord",
        outcome: landlordValues.outcome,
        landlordSideSelections: landlordSideSelections.map((id) => Number(id)),
        numBombs: landlordValues.numBombs,
        gameMultiplier: landlordValues.gameMultiplier,
      },
    });
  }

  async function handleFtlQuickFillSubmit() {
    if (!game) return;
    const entries = unlockedPlayers.map((player) => {
      const raw = Number(ftlQuickFillInputs[player.playerId] ?? 0);
      return {
        playerId: player.playerId,
        pointDelta: clampToTwoDecimals(raw),
      };
    });
    let total = entries.reduce((sum, e) => sum + e.pointDelta, 0);
    if (Math.abs(total) > 0.01) {
      const zeroPlayers = entries.filter((e) => Math.abs(e.pointDelta) < 0.01);
      if (zeroPlayers.length > 0) {
        const share = -total / zeroPlayers.length;
        for (const entry of entries) {
          if (Math.abs(entry.pointDelta) < 0.01) {
            entry.pointDelta = clampToTwoDecimals(share);
          }
        }
      }
    }
    const summaryText = entries
      .map(
        (e) =>
          `${unlockedPlayers.find((p) => p.playerId === e.playerId)?.displayName ?? e.playerId} ${e.pointDelta > 0 ? "+" : ""}${clampToTwoDecimals(e.pointDelta)}`,
      )
      .join(", ");
    await createRoundMutation.mutateAsync({
      entries,
      summaryText,
      metadata: {
        mode: "fight-the-landlord",
        quickFill: true,
      },
    });
  }

  async function handleWerewolvesRoundSubmit() {
    if (!game || unlockedPlayers.length < 3) return;
    const activePlayerIds = unlockedPlayers.map((p) => String(p.playerId));
    const playerAssignments = activePlayerIds.map((playerId) => ({
      playerId,
      team: (werewolfValues.playerTeams[Number(playerId)] ??
        "villager") as WerewolfTeamId,
    }));
    const result = calculateWerewolvesRound({
      activePlayerIds,
      pointBasis: game.pointBasis,
      playerAssignments,
      survivedPlayerIds: werewolfValues.survivedIds.map(String),
      winningTeamIds: werewolfValues.winningTeamIds,
    });
    const playerNameById = new Map(
      unlockedPlayers.map((p) => [String(p.playerId), p.displayName]),
    );
    const entries = result.entries.map((entry) => ({
      playerId: Number(entry.playerId),
      pointDelta: entry.pointDelta,
    }));
    const summaryText = entries
      .map(
        (e) =>
          `${playerNameById.get(String(e.playerId)) ?? e.playerId} ${e.pointDelta > 0 ? "+" : ""}${e.pointDelta}`,
      )
      .join(", ");
    await createRoundMutation.mutateAsync({
      entries,
      summaryText,
      metadata: {
        mode: "werewolves",
        winningTeamIds: werewolfValues.winningTeamIds,
      },
    });
  }

  async function handleBasketballRoundSubmit() {
    if (!game) {
      return;
    }

    const teamA = sortedUnlockedPlayers
      .filter((player) => basketballTeamByPlayerId[player.playerId] === "A")
      .map((player) => player.playerId);
    const teamB = sortedUnlockedPlayers
      .filter((player) => basketballTeamByPlayerId[player.playerId] === "B")
      .map((player) => player.playerId);

    if (teamA.length < 1 || teamB.length < 1) {
      window.alert("Put at least one unlocked player on each team.");
      return;
    }

    const scoreTeamA = Number(basketballScores.teamA);
    const scoreTeamB = Number(basketballScores.teamB);

    if (
      !Number.isFinite(scoreTeamA) ||
      !Number.isFinite(scoreTeamB) ||
      !Number.isInteger(scoreTeamA) ||
      !Number.isInteger(scoreTeamB) ||
      scoreTeamA < 0 ||
      scoreTeamB < 0
    ) {
      window.alert("Enter non-negative integer scores for both teams.");
      return;
    }

    const priorRounds = priorBasketballMatchesFromRoundSnapshots(game.rounds);
    const result = calculateBasketballRound({
      priorRounds,
      match: {
        teamAPlayerIds: teamA,
        teamBPlayerIds: teamB,
        scoreTeamA,
        scoreTeamB,
      },
    });

    const entries = result.entries.map((entry) => ({
      playerId: Number(entry.playerId),
      pointDelta: clampToTwoDecimals(entry.pointDelta),
    }));

    const playerNameById = new Map(
      sortedUnlockedPlayers.map((player) => [
        player.playerId,
        player.displayName,
      ]),
    );
    const summaryText = entries
      .map((entry) => {
        const displayName =
          playerNameById.get(entry.playerId) ?? entry.playerId;
        const rounded = clampToTwoDecimals(entry.pointDelta);
        return `${displayName} ${rounded > 0 ? "+" : ""}${rounded}`;
      })
      .join(", ");

    await createRoundMutation.mutateAsync({
      entries,
      summaryText,
      metadata: {
        mode: "basketball",
        teamAPlayerIds: teamA,
        teamBPlayerIds: teamB,
        scoreTeamA,
        scoreTeamB,
        basketballLedgerScale: DEFAULT_BASKETBALL_LEDGER_SCALE,
      },
    });
    setBasketballScores({ teamA: "", teamB: "" });
  }

  const pointStep =
    game?.gameTypeId === "dixit" || game?.gameTypeId === "basketball"
      ? 0.01
      : (game?.pointBasis ?? 1);

  function adjustPointInput(
    _current: Record<number, string>,
    setter: Dispatch<SetStateAction<Record<number, string>>>,
    playerId: number,
    delta: number,
  ) {
    setter((prev) => {
      const raw = Number(prev[playerId] ?? 0);
      const next = clampToTwoDecimals(raw + delta);
      return { ...prev, [playerId]: String(next) };
    });
  }

  return (
    <section className="stack-lg">
      <div className="inline-actions space-between">
        <Link to="/" className="secondary-button link-button">
          Back to games
        </Link>
        <span className="pill">
          {game.status === "settled" ? "Settled" : isAdmin ? "Admin mode" : "Read only"}
        </span>
      </div>

      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Game view</p>
            <h2>{game.displayName}</h2>
            <p className="muted">
              {getGameTypeOption(game.gameTypeId)?.name ?? game.gameTypeId}
              {game.gameTypeId !== "dixit" && game.gameTypeId !== "basketball" ? (
                <> · point basis {game.pointBasis}</>
              ) : null}
              {" · "}
              {formatMoneyCents(game.moneyPerPointCents)} per point
            </p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={!isAdmin || game.status === "settled"}
              onClick={() => setShowRoundForm((current) => !current)}
            >
              New round
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!isAdmin || game.status === "settled"}
              onClick={() => setShowAddPlayers((current) => !current)}
            >
              Add players
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!isAdmin || game.status === "settled"}
              onClick={() => setShowGameSettings((current) => !current)}
            >
              Game settings
            </button>
          </div>
        </div>

        {showGameSettings ? (
          <form
            className="card-subsection stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void updateSettingsMutation.mutateAsync();
            }}
          >
              <label className="stack-xs">
                <span>Display name</span>
                <input
                  maxLength={25}
                  value={settingsValues.displayName}
                onChange={(event) =>
                  setSettingsValues((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <div className="form-grid">
              {game.gameTypeId !== "dixit" && game.gameTypeId !== "basketball" ? (
                <label className="stack-xs">
                  <span>Point basis</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settingsValues.pointBasis}
                    onChange={(event) =>
                      setSettingsValues((current) => ({
                        ...current,
                        pointBasis: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}
              <label className="stack-xs">
                <span>Money per point (cents)</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={settingsValues.moneyPerPointCents}
                  onChange={(event) =>
                    setSettingsValues((current) => ({
                      ...current,
                      moneyPerPointCents: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {updateSettingsMutation.error ? (
              <p className="form-error">{updateSettingsMutation.error.message}</p>
            ) : null}
            <div className="inline-actions">
              <button type="submit" className="primary-button">
                Save settings
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowGameSettings(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {showAddPlayers ? (
          <div className="card-subsection stack-sm">
            <div className="stack-sm">
              <strong>Add existing players</strong>
              {availablePlayers.length === 0 ? (
                <p className="muted">All players are already in this game.</p>
              ) : (
                <>
                  <PlayerSortButtons
                    sortMode={addPlayersSort}
                    onSortChange={setAddPlayersSort}
                  />
                  <div className="checkbox-list player-list-two-col">
                    {sortedAvailablePlayers.map((player) => (
                    <label key={player.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={(event) =>
                          setSelectedPlayerIds((current) =>
                            event.target.checked
                              ? [...current, player.id]
                              : current.filter((value) => value !== player.id),
                          )
                        }
                      />
                      <span className="text-wrap-safe">{player.displayName}</span>
                    </label>
                  ))}
                </div>
                </>
              )}
              {addPlayersMutation.error ? (
                <p className="form-error">{addPlayersMutation.error.message}</p>
              ) : null}
              <div className="inline-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={selectedPlayerIds.length === 0}
                  onClick={() => void addPlayersMutation.mutateAsync()}
                >
                  Add selected players
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddPlayers(false)}
                >
                  Done
                </button>
              </div>
            </div>

            <form
              className="stack-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void createPlayerMutation.mutateAsync();
              }}
            >
              <strong>Create player</strong>
              <label className="stack-xs">
                <span>Name</span>
                <input
                  maxLength={25}
                  value={createPlayerValues.displayName}
                  onChange={(event) =>
                    setCreatePlayerValues((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="New player name"
                />
              </label>
              <label className="stack-xs">
                <span>Family name (optional)</span>
                <input
                  value={createPlayerValues.familyName}
                  onChange={(event) =>
                    setCreatePlayerValues((current) => ({
                      ...current,
                      familyName: event.target.value,
                    }))
                  }
                  placeholder="Optional family"
                />
              </label>
              {createPlayerMutation.error ? (
                <p className="form-error">{createPlayerMutation.error.message}</p>
              ) : null}
              <button type="submit" className="secondary-button">
                Create player
              </button>
            </form>
          </div>
        ) : null}

        {showRoundForm ? (
          <div className="card-subsection stack-sm">
            <strong>
              {game.gameTypeId === "texas-holdem"
                ? "Texas Hold'em round"
                : game.gameTypeId === "werewolves"
                  ? "Werewolves round"
                  : game.gameTypeId === "dixit"
                    ? "Dixit round"
                    : game.gameTypeId === "basketball"
                      ? "Basketball round"
                      : "Fight the Landlord round"}
            </strong>

            {game.gameTypeId === "werewolves" &&
            sortedUnlockedPlayers.length < 3 ? (
              <p className="muted">
                Unlock at least three players before creating a round.
              </p>
            ) : sortedUnlockedPlayers.length < 2 ? (
              <p className="muted">
                Unlock at least two players before creating a round.
              </p>
            ) : game.gameTypeId === "texas-holdem" ? (
              <form
                className="stack-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleTexasHoldemRoundSubmit();
                }}
              >
                {sortedUnlockedPlayers.map((player) => (
                  <label key={player.playerId} className="stack-xs">
                    <span>{player.displayName}</span>
                    <div className="inline-actions point-input-row">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Decrease ${player.displayName} by ${pointStep}`}
                        onClick={() =>
                          adjustPointInput(
                            texasPointInputs,
                            setTexasPointInputs,
                            player.playerId,
                            -pointStep,
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={texasPointInputs[player.playerId] ?? "0"}
                        onChange={(event) =>
                          setTexasPointInputs((current) => ({
                            ...current,
                            [player.playerId]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Increase ${player.displayName} by ${pointStep}`}
                        onClick={() =>
                          adjustPointInput(
                            texasPointInputs,
                            setTexasPointInputs,
                            player.playerId,
                            pointStep,
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>
                ))}
                {createRoundMutation.error ? (
                  <p className="form-error">{createRoundMutation.error.message}</p>
                ) : null}
                <div className="inline-actions">
                  <button type="submit" className="primary-button">
                    Save round
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowRoundForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : game.gameTypeId === "dixit" ? (
              <form
                className="stack-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleDixitRoundSubmit();
                }}
              >
                <p className="muted">
                  Enter raw scores. Saved points remove the per-player mean, scale by
                  (highest minus lowest raw score) divided by 10, then round so the
                  round still sums to zero.
                </p>
                {sortedUnlockedPlayers.map((player) => (
                  <label key={player.playerId} className="stack-xs">
                    <span>{player.displayName}</span>
                    <div className="inline-actions point-input-row">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Decrease ${player.displayName} by ${pointStep}`}
                        onClick={() =>
                          adjustPointInput(
                            dixitPointInputs,
                            setDixitPointInputs,
                            player.playerId,
                            -pointStep,
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={dixitPointInputs[player.playerId] ?? "0"}
                        onChange={(event) =>
                          setDixitPointInputs((current) => ({
                            ...current,
                            [player.playerId]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Increase ${player.displayName} by ${pointStep}`}
                        onClick={() =>
                          adjustPointInput(
                            dixitPointInputs,
                            setDixitPointInputs,
                            player.playerId,
                            pointStep,
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>
                ))}
                {createRoundMutation.error ? (
                  <p className="form-error">{createRoundMutation.error.message}</p>
                ) : null}
                <div className="inline-actions">
                  <button type="submit" className="primary-button">
                    Save round
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowRoundForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : game.gameTypeId === "werewolves" ? (
              <form
                className="stack-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleWerewolvesRoundSubmit();
                }}
              >
                <p className="muted">
                  Assign team per player, who survived, and which team(s) won.
                </p>
                <div className="stack-sm">
                  <span>Winning team(s)</span>
                  <div className="checkbox-list player-list-two-col">
                    {WEREWOLF_TEAMS.map((teamId) => (
                      <label key={teamId} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={werewolfValues.winningTeamIds.includes(teamId)}
                          onChange={(e) =>
                            setWerewolfValues((c) => ({
                              ...c,
                              winningTeamIds: e.target.checked
                                ? [...c.winningTeamIds, teamId]
                                : c.winningTeamIds.filter((t) => t !== teamId),
                            }))
                          }
                        />
                        <span>
                          {teamId.charAt(0).toUpperCase() + teamId.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="stack-sm">
                  <span>Survived (alive at end)</span>
                  <div className="checkbox-list player-list-two-col">
                    {sortedUnlockedPlayers.map((player) => (
                      <label key={player.playerId} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={werewolfValues.survivedIds.includes(
                            player.playerId,
                          )}
                          onChange={(e) =>
                            setWerewolfValues((c) => ({
                              ...c,
                              survivedIds: e.target.checked
                                ? [...c.survivedIds, player.playerId]
                                : c.survivedIds.filter(
                                    (id) => id !== player.playerId,
                                  ),
                            }))
                          }
                        />
                        <span>{player.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="stack-sm">
                  <span>Team per player</span>
                  <div className="player-list-two-col">
                    {sortedUnlockedPlayers.map((player) => (
                      <label key={player.playerId} className="stack-xs">
                        <span>{player.displayName}</span>
                        <select
                          value={
                            werewolfValues.playerTeams[player.playerId] ??
                            "villager"
                          }
                          onChange={(e) =>
                            setWerewolfValues((c) => ({
                              ...c,
                              playerTeams: {
                                ...c.playerTeams,
                                [player.playerId]: e.target
                                  .value as WerewolfTeamId,
                              },
                            }))
                          }
                        >
                          {WEREWOLF_TEAMS.map((teamId) => (
                            <option key={teamId} value={teamId}>
                              {teamId.charAt(0).toUpperCase() +
                                teamId.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
                {createRoundMutation.error ? (
                  <p className="form-error">
                    {createRoundMutation.error.message}
                  </p>
                ) : null}
                <div className="inline-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={werewolfValues.winningTeamIds.length === 0}
                  >
                    Save round
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowRoundForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : game.gameTypeId === "basketball" ? (
              <form
                className="stack-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleBasketballRoundSubmit();
                }}
              >
                <p className="muted">
                  Assign only participating players to team A or B (leave others as
                  none), then enter the final score for this game. Point basis stays 1;
                  OpenSkill ordinal changes
                  are scaled by a fixed ledger factor (currently {DEFAULT_BASKETBALL_LEDGER_SCALE})
                  so a typical 11‑point game moves each player on the order of ~10–20
                  points, then mean‑centered so the round sums to exactly zero.
                </p>
                <div className="form-grid">
                  <label className="stack-xs">
                    <span>Team A score</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={basketballScores.teamA}
                      onChange={(event) =>
                        setBasketballScores((current) => ({
                          ...current,
                          teamA: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="stack-xs">
                    <span>Team B score</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={basketballScores.teamB}
                      onChange={(event) =>
                        setBasketballScores((current) => ({
                          ...current,
                          teamB: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="stack-sm">
                  <PlayerSortButtons
                    sortMode={unlockedSort}
                    onSortChange={setUnlockedSort}
                  />
                  <div className="player-list-two-col">
                    {sortedUnlockedPlayers.map((player) => (
                      <label key={player.playerId} className="stack-xs">
                        <span>{player.displayName}</span>
                        <select
                          value={basketballTeamByPlayerId[player.playerId] ?? "none"}
                          onChange={(event) =>
                            setBasketballTeamByPlayerId((current) => ({
                              ...current,
                              [player.playerId]: event.target.value as "none" | "A" | "B",
                            }))
                          }
                        >
                          <option value="none">None</option>
                          <option value="A">Team A</option>
                          <option value="B">Team B</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
                {createRoundMutation.error ? (
                  <p className="form-error">{createRoundMutation.error.message}</p>
                ) : null}
                <div className="inline-actions">
                  <button type="submit" className="primary-button">
                    Save round
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowRoundForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : ftlQuickFillMode ? (
              <form
                className="stack-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleFtlQuickFillSubmit();
                }}
              >
                <p className="muted">
                  Enter points per player. If the total is not zero, the remainder is split among players with 0.
                </p>
                {sortedUnlockedPlayers.map((player) => (
                  <label key={player.playerId} className="stack-xs">
                    <span>{player.displayName}</span>
                    <div className="inline-actions point-input-row">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Decrease ${player.displayName} by ${pointStep}`}
                        onClick={() =>
                          adjustPointInput(
                            ftlQuickFillInputs,
                            setFtlQuickFillInputs,
                            player.playerId,
                            -pointStep,
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={ftlQuickFillInputs[player.playerId] ?? "0"}
                        onChange={(event) =>
                          setFtlQuickFillInputs((current) => ({
                            ...current,
                            [player.playerId]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Increase ${player.displayName} by ${pointStep}`}
                        onClick={() =>
                          adjustPointInput(
                            ftlQuickFillInputs,
                            setFtlQuickFillInputs,
                            player.playerId,
                            pointStep,
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>
                ))}
                {createRoundMutation.error ? (
                  <p className="form-error">{createRoundMutation.error.message}</p>
                ) : null}
                <div className="inline-actions">
                  <button type="submit" className="primary-button">
                    Save round
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setFtlQuickFillMode(false)}
                  >
                    Use multipliers
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowRoundForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setFtlQuickFillMode(true)}
                  >
                    Quick Fill
                  </button>
                </div>
                <form
                  className="stack-sm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleFightTheLandlordRoundSubmit();
                  }}
                >
                  <label className="stack-xs">
                    <span>Outcome</span>
                    <select
                      value={landlordValues.outcome}
                      onChange={(event) =>
                        setLandlordValues((current) => ({
                          ...current,
                          outcome: event.target.value as "won" | "lost",
                        }))
                      }
                    >
                      <option value="won">Landlord side won</option>
                      <option value="lost">Landlord side lost</option>
                    </select>
                  </label>
                  <div className="stack-sm">
                    <span>Landlord side (selections per player)</span>
                    <PlayerSortButtons
                      sortMode={unlockedSort}
                      onSortChange={setUnlockedSort}
                    />
                    <div className="player-list-two-col">
                      {sortedUnlockedPlayers.map((player) => (
                        <label key={player.playerId} className="stack-xs">
                          <span>{player.displayName}</span>
                          <div className="inline-actions point-input-row">
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Decrease landlord side selections for ${player.displayName}`}
                              onClick={() =>
                                setLandlordValues((c) => {
                                  const current =
                                    c.selections[player.playerId] ?? 0;
                                  const next = Math.max(0, current - 1);
                                  return {
                                    ...c,
                                    selections: {
                                      ...c.selections,
                                      [player.playerId]: next,
                                    },
                                  };
                                })
                              }
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              value={landlordValues.selections[player.playerId] ?? 0}
                              onChange={(e) =>
                                setLandlordValues((c) => {
                                  const raw = parseInt(e.target.value, 10);
                                  const next = Number.isNaN(raw)
                                    ? 0
                                    : Math.min(9, Math.max(0, raw));
                                  return {
                                    ...c,
                                    selections: {
                                      ...c.selections,
                                      [player.playerId]: next,
                                    },
                                  };
                                })
                              }
                              style={{ width: "3.5rem", maxWidth: "3.5rem" }}
                            />
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Increase landlord side selections for ${player.displayName}`}
                              onClick={() =>
                                setLandlordValues((c) => {
                                  const current =
                                    c.selections[player.playerId] ?? 0;
                                  const next = Math.min(9, current + 1);
                                  return {
                                    ...c,
                                    selections: {
                                      ...c.selections,
                                      [player.playerId]: next,
                                    },
                                  };
                                })
                              }
                            >
                              +
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="stack-xs">
                    <span>Game multiplier</span>
                    <div className="inline-actions point-input-row">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Decrease game multiplier"
                        onClick={() =>
                          setLandlordValues((c) => ({
                            ...c,
                            gameMultiplier: Math.max(1, c.gameMultiplier - 1),
                          }))
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={landlordValues.gameMultiplier}
                        onChange={(e) =>
                          setLandlordValues((c) => ({
                            ...c,
                            gameMultiplier: Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Increase game multiplier"
                        onClick={() =>
                          setLandlordValues((c) => ({
                            ...c,
                            gameMultiplier: c.gameMultiplier + 1,
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>
                  <label className="stack-xs">
                    <span># of Bombs</span>
                    <div className="inline-actions point-input-row">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Decrease number of bombs"
                        onClick={() =>
                          setLandlordValues((c) => ({
                            ...c,
                            numBombs: Math.max(0, c.numBombs - 1),
                          }))
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={landlordValues.numBombs}
                        onChange={(e) =>
                          setLandlordValues((c) => ({
                            ...c,
                            numBombs: Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Increase number of bombs"
                        onClick={() =>
                          setLandlordValues((c) => ({
                            ...c,
                            numBombs: c.numBombs + 1,
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>
                  {createRoundMutation.error ? (
                    <p className="form-error">{createRoundMutation.error.message}</p>
                  ) : null}
                  <div className="inline-actions">
                    <button type="submit" className="primary-button">
                      Save round
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowRoundForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        ) : null}

        <div className="stack-xs">
          <PlayerSortButtons
            sortMode={gamePlayersSort}
            onSortChange={setGamePlayersSort}
          />
        </div>
        <ul className="list-reset stack-sm player-list-two-col">
          {sortedGamePlayers.map((player) => {
            const formattedTotal = formatPoints(player.total);
            return (
              <li key={player.gamePlayerId} className="list-item">
                <div className="stack-xs">
                  <strong className="text-wrap-safe">{player.displayName}</strong>
                  <p className="muted">
                    {player.isLocked ? "Locked for new rounds" : "Active"}
                  </p>
                </div>
                <div className="inline-actions">
                  <span
                    className={
                      player.total > 0
                        ? "score-positive"
                        : player.total < 0
                          ? "score-negative"
                          : "score-neutral"
                    }
                  >
                    {player.total > 0 ? `+${formattedTotal}` : formattedTotal}
                  </span>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!isAdmin || game.status === "settled"}
                  onClick={() =>
                    void togglePlayerLockMutation.mutateAsync({
                      gamePlayerId: player.gamePlayerId,
                      isLocked: !player.isLocked,
                    })
                  }
                >
                  {player.isLocked ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!isAdmin || game.status === "settled"}
                  onClick={() => {
                    const shouldRemove = window.confirm(
                      `Remove ${player.displayName} from this game?`,
                    );

                    if (!shouldRemove) {
                      return;
                    }

                    void removeGamePlayerMutation.mutateAsync(player.gamePlayerId);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
            );
          })}
        </ul>

        <div className="inline-actions space-between">
          <strong>Game total: {formatPoints(totalPoints)}</strong>
          <button
            type="button"
            className="primary-button"
            disabled={
              !isAdmin ||
              game.status === "settled" ||
              game.players.length < 2
            }
            onClick={() => {
              const message =
                game.moneyPerPointCents === 0
                  ? "End this game and mark as settled? (No money to exchange.)"
                  : "End this game and calculate settlement?";
              const shouldSettle = window.confirm(message);

              if (!shouldSettle) {
                return;
              }

              void calculateSettlementMutation.mutateAsync();
            }}
          >
            Settle
          </button>
        </div>
      </article>

      {game.settlement ? (
        <article className="card stack-sm">
          <div className="card-header">
            <div>
              <p className="card-eyebrow">Settlement</p>
              <h2>{formatDateTime(game.settlement.createdAt)}</h2>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={!isAdmin}
              onClick={() => {
                const shouldUndo = window.confirm(
                  "Undo this settlement and reopen the game?",
                );

                if (!shouldUndo) {
                  return;
                }

                void undoSettlementMutation.mutateAsync();
              }}
            >
              Undo settlement
            </button>
          </div>
          <ul className="list-reset stack-sm">
            {game.settlement.transfers.map((transfer) => (
              <li key={transfer.id} className="list-item">
                <div className="stack-xs">
                  <strong className="text-wrap-safe">
                    {transfer.fromLabel} {"->"} {transfer.toLabel}
                  </strong>
                  <p className="muted">{formatMoneyCents(transfer.amountCents)}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">History</p>
            <h2>Most recent first</h2>
          </div>
          <span className="pill">{game.rounds.length} rounds</span>
        </div>

        {game.rounds.length === 0 ? (
          <p className="muted">No rounds yet.</p>
        ) : (
          <ul className="list-reset stack-sm">
            {game.rounds.map((round) => (
              <li key={round.id} className="list-item">
                <div className="stack-xs">
                  <strong>Round {round.roundNumber}</strong>
                  <p className="muted">{round.summaryText}</p>
                  <p className="muted">{formatDateTime(round.createdAt)}</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!isAdmin}
                  onClick={() => {
                    const shouldDelete = window.confirm(
                      `Delete round ${round.roundNumber}?`,
                    );

                    if (!shouldDelete) {
                      return;
                    }

                    void deleteRoundMutation.mutateAsync(round.id);
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
