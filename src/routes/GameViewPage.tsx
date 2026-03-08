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
import { calculateFightTheLandlordRound } from "../features/game-types/fightTheLandlord";
import { calculateTexasHoldemRound } from "../features/game-types/texasHoldem";
import {
  type WerewolfTeamId,
  WEREWOLF_TEAMS,
  calculateWerewolvesRound,
} from "../features/game-types/werewolves";
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
    moneyPerPointCents: "20",
  });
  const [texasPointInputs, setTexasPointInputs] = useState<Record<number, string>>(
    {},
  );
  const [landlordValues, setLandlordValues] = useState({
    outcome: "won" as "won" | "lost",
    landlordId: "",
    gameMultiplier: 1,
    landlordMultiplier: 1,
    numBombs: 0,
    friendIds: [] as string[],
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
        pointBasis: Number(settingsValues.pointBasis),
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
      setLandlordValues({
        outcome: "won",
        landlordId: "",
        gameMultiplier: 1,
        landlordMultiplier: 1,
        numBombs: 0,
        friendIds: [],
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

  async function handleFightTheLandlordRoundSubmit() {
    if (!landlordValues.landlordId) {
      return;
    }

    const currentGame = game;

    if (!currentGame) {
      return;
    }

    const result = calculateFightTheLandlordRound({
      activePlayerIds: unlockedPlayers.map((player) => String(player.playerId)),
      landlordId: landlordValues.landlordId,
      landlordFriendIds: landlordValues.friendIds,
      outcome: landlordValues.outcome,
      pointBasis: currentGame.pointBasis,
      numBombs: landlordValues.numBombs,
      gameMultiplier: landlordValues.gameMultiplier,
      landlordMultiplier: landlordValues.landlordMultiplier,
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
        landlordId: Number(landlordValues.landlordId),
        landlordFriendIds: landlordValues.friendIds.map((value) => Number(value)),
        numBombs: landlordValues.numBombs,
        gameMultiplier: landlordValues.gameMultiplier,
        landlordMultiplier: landlordValues.landlordMultiplier,
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

  const pointStep = game?.pointBasis ?? 1;

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
              {game.gameTypeId} · point basis {game.pointBasis} ·{" "}
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
                  <label className="stack-xs">
                    <span>Landlord</span>
                    <select
                      value={landlordValues.landlordId}
                      onChange={(event) =>
                        setLandlordValues((current) => ({
                          ...current,
                          landlordId: event.target.value,
                          friendIds: current.friendIds.filter(
                            (value) => value !== event.target.value,
                          ),
                        }))
                      }
                    >
                      <option value="">Select landlord</option>
                      {sortedUnlockedPlayers.map((player) => (
                        <option key={player.playerId} value={player.playerId}>
                          {player.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="stack-sm">
                    <span>Landlord friends</span>
                    <PlayerSortButtons
                      sortMode={unlockedSort}
                      onSortChange={setUnlockedSort}
                    />
                    <div className="checkbox-list player-list-two-col">
                      {sortedUnlockedPlayers
                        .filter(
                          (player) =>
                            String(player.playerId) !== landlordValues.landlordId,
                        )
                        .map((player) => (
                          <label key={player.playerId} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={landlordValues.friendIds.includes(
                                String(player.playerId),
                              )}
                              onChange={(event) =>
                                setLandlordValues((current) => ({
                                  ...current,
                                  friendIds: event.target.checked
                                    ? [...current.friendIds, String(player.playerId)]
                                    : current.friendIds.filter(
                                        (value) => value !== String(player.playerId),
                                      ),
                                }))
                              }
                            />
                            <span>{player.displayName}</span>
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
                    <span>Landlord multiplier</span>
                    <div className="inline-actions point-input-row">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Decrease landlord multiplier"
                        onClick={() =>
                          setLandlordValues((c) => ({
                            ...c,
                            landlordMultiplier: Math.max(
                              1,
                              c.landlordMultiplier - 1,
                            ),
                          }))
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={landlordValues.landlordMultiplier}
                        onChange={(e) =>
                          setLandlordValues((c) => ({
                            ...c,
                            landlordMultiplier: Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Increase landlord multiplier"
                        onClick={() =>
                          setLandlordValues((c) => ({
                            ...c,
                            landlordMultiplier: c.landlordMultiplier + 1,
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
            Calculate $
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
