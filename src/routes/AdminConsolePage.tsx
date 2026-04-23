import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAdminSession } from "../features/admin/AdminSessionContext";
import {
  PlayerSortButtons,
  useSortedPlayers,
} from "../features/players/SortablePlayerList";
import { IconGlyph } from "../features/ui/IconGlyph";
import { adminWrite } from "../lib/api/admin";
import { fetchPlayers } from "../lib/api/read";

export function AdminConsolePage() {
  const queryClient = useQueryClient();
  const { isAdmin, password } = useAdminSession();
  const [renameValues, setRenameValues] = useState<Record<number, string>>({});
  const [familyValues, setFamilyValues] = useState<Record<number, string>>({});
  const [createPlayerValues, setCreatePlayerValues] = useState({
    displayName: "",
    familyName: "",
  });

  const playersQuery = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  const renameMutation = useMutation({
    mutationFn: async ({
      playerId,
      displayName,
    }: {
      playerId: number;
      displayName: string;
    }) => {
      if (!password) {
        throw new Error("Admin session has expired. Please log in again.");
      }

      return adminWrite({
        action: "rename_player",
        password,
        playerId,
        displayName,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["game"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const setFamilyMutation = useMutation({
    mutationFn: async ({
      playerId,
      familyName,
    }: {
      playerId: number;
      familyName: string | null;
    }) => {
      if (!password) {
        throw new Error("Admin session has expired. Please log in again.");
      }

      return adminWrite({
        action: "set_player_family",
        password,
        playerId,
        familyName,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["game"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async () => {
      if (!password) {
        throw new Error("Admin session has expired. Please log in again.");
      }

      return adminWrite({
        action: "create_player",
        password,
        displayName: createPlayerValues.displayName,
        familyName: createPlayerValues.familyName || null,
      });
    },
    onSuccess: async () => {
      setCreatePlayerValues({ displayName: "", familyName: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["game"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: number) => {
      if (!password) {
        throw new Error("Admin session has expired. Please log in again.");
      }

      return adminWrite({
        action: "delete_player",
        password,
        playerId,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["game"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const players = playersQuery.data ?? [];
  const [sortedPlayers, sortMode, setSortMode] = useSortedPlayers(players);

  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Admin console</p>
            <h2>Maintenance tools</h2>
          </div>
          <span className={isAdmin ? "pill pill-success" : "pill"}>
            {isAdmin ? "Ready for admin actions" : "Locked"}
          </span>
        </div>

        <p className="muted">
          Use this page for safe player renames and family membership updates.
        </p>

        {!isAdmin ? (
          <p className="muted">
            Log in on the Games page to unlock admin maintenance actions.
          </p>
        ) : null}
        {playersQuery.isLoading ? (
          <p className="muted">Loading players...</p>
        ) : null}
        {playersQuery.error ? (
          <p className="form-error">{playersQuery.error.message}</p>
        ) : null}

        {isAdmin ? (
          <form
            className="card-subsection stack-sm"
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
        ) : null}

        <div className="stack-sm">
          <PlayerSortButtons sortMode={sortMode} onSortChange={setSortMode} />
          <div className="player-list-two-col">
            {sortedPlayers.map((player) => (
              <article key={player.id} className="card-subsection stack-sm">
                <div className="card-header">
                  <div>
                    <div className="inline-actions">
                      <strong className="text-wrap-safe">{player.displayName}</strong>
                      <span className="player-id-muted"> #{player.id}</span>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={!isAdmin}
                        aria-label={`Delete ${player.displayName}`}
                        onClick={() => {
                          const shouldDelete = window.confirm(
                            `Delete ${player.displayName}? This will deactivate the player and remove them from player lists.`,
                          );

                          if (!shouldDelete) {
                            return;
                          }

                          void deletePlayerMutation.mutateAsync(player.id);
                        }}
                      >
                        <IconGlyph name="trash" />
                      </button>
                    </div>
                    <p className="muted">
                      {player.familyId ? `Family linked` : "No family set"}
                    </p>
                  </div>
                </div>

              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextDisplayName =
                    renameValues[player.id]?.trim() || player.displayName;
                  void renameMutation.mutateAsync({
                    playerId: player.id,
                    displayName: nextDisplayName,
                  });
                }}
              >
                <label className="stack-xs">
                  <span>Rename player</span>
                  <input
                    maxLength={25}
                    value={renameValues[player.id] ?? player.displayName}
                    onChange={(event) =>
                      setRenameValues((current) => ({
                        ...current,
                        [player.id]: event.target.value,
                      }))
                    }
                    disabled={!isAdmin}
                  />
                </label>
                <div className="align-end">
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={!isAdmin}
                  >
                    Save name
                  </button>
                </div>
              </form>

              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  const rawFamilyName = familyValues[player.id];
                  void setFamilyMutation.mutateAsync({
                    playerId: player.id,
                    familyName: rawFamilyName?.trim() ? rawFamilyName.trim() : null,
                  });
                }}
              >
                <label className="stack-xs">
                  <span>Family name</span>
                  <input
                    value={familyValues[player.id] ?? ""}
                    onChange={(event) =>
                      setFamilyValues((current) => ({
                        ...current,
                        [player.id]: event.target.value,
                      }))
                    }
                    placeholder="Leave blank to clear"
                    disabled={!isAdmin}
                  />
                </label>
                <div className="align-end">
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={!isAdmin}
                  >
                    Save family
                  </button>
                </div>
              </form>
            </article>
          ))}
          </div>
        </div>

        {renameMutation.error ? (
          <p className="form-error">{renameMutation.error.message}</p>
        ) : null}
        {setFamilyMutation.error ? (
          <p className="form-error">{setFamilyMutation.error.message}</p>
        ) : null}
        {deletePlayerMutation.error ? (
          <p className="form-error">{deletePlayerMutation.error.message}</p>
        ) : null}
      </article>
    </section>
  );
}
