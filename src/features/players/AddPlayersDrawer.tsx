import { useMemo, useState, type ReactNode } from "react";
import { copy } from "../ui/copy";
import { useDebouncedValue } from "../ui/useDebouncedValue";
import { PlayerPill } from "../ui/PlayerPill";
import {
  PlayerSortButtons,
  type PlayerLike,
  type PlayerSortMode,
  sortPlayers,
} from "./SortablePlayerList";

type AddPlayersDrawerProps<T extends PlayerLike> = {
  players: T[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  sortMode: PlayerSortMode;
  onSortChange: (mode: PlayerSortMode) => void;
  onAddSelected: () => void;
  onDone: () => void;
  addError?: string | null;
  isAdding?: boolean;
  children?: ReactNode;
};

function playerKey(player: PlayerLike): number {
  return player.id ?? player.playerId ?? 0;
}

export function AddPlayersDrawer<T extends PlayerLike>({
  players,
  selectedIds,
  onSelectionChange,
  sortMode,
  onSortChange,
  onAddSelected,
  onDone,
  addError,
  isAdding = false,
  children,
}: AddPlayersDrawerProps<T>) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const sortedPlayers = useMemo(
    () => sortPlayers(players, sortMode),
    [players, sortMode],
  );

  const visiblePlayers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) {
      return sortedPlayers;
    }
    return sortedPlayers.filter((player) =>
      player.displayName.toLowerCase().includes(query),
    );
  }, [sortedPlayers, debouncedSearch]);

  const togglePlayer = (playerId: number) => {
    onSelectionChange(
      selectedIds.includes(playerId)
        ? selectedIds.filter((id) => id !== playerId)
        : [...selectedIds, playerId],
    );
  };

  return (
    <div className="add-players-drawer stack-sm">
      <div className="add-players-drawer-header">
        <strong>{copy.addPlayers.title}</strong>
        <button type="button" className="secondary-button" onClick={onDone}>
          {copy.common.done}
        </button>
      </div>

      {players.length === 0 ? (
        <p className="muted">{copy.addPlayers.allInGame}</p>
      ) : (
        <>
          <input
            type="search"
            className="search-bar-compact"
            placeholder={copy.addPlayers.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={copy.addPlayers.searchPlaceholder}
          />
          <PlayerSortButtons
            sortMode={sortMode}
            onSortChange={onSortChange}
            context="add-players"
          />
          <div
            className="player-pill-grid"
            role="group"
            aria-label="Select players"
          >
            {visiblePlayers.length === 0 ? (
              <p className="muted">{copy.addPlayers.noSearchMatch}</p>
            ) : (
              visiblePlayers.map((player) => {
                const id = playerKey(player);
                return (
                  <PlayerPill
                    key={id}
                    displayName={player.displayName}
                    selected={selectedIds.includes(id)}
                    onToggle={() => togglePlayer(id)}
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {addError ? <p className="form-error">{addError}</p> : null}

      <div className="inline-actions">
        <button
          type="button"
          className="primary-button"
          disabled={selectedIds.length === 0 || isAdding}
          onClick={onAddSelected}
        >
          {copy.addPlayers.addSelected}
        </button>
      </div>

      {children}
    </div>
  );
}
