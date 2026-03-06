import { useMemo, useState } from "react";

export type PlayerSortMode = "id" | "name-asc" | "name-desc";

export type PlayerLike = { id?: number; playerId?: number; displayName: string };

function sortKey(p: PlayerLike): number {
  return p.id ?? p.playerId ?? 0;
}

export function useSortedPlayers<T extends PlayerLike>(
  players: T[],
  defaultSort: PlayerSortMode = "id",
): [T[], PlayerSortMode, (mode: PlayerSortMode) => void] {
  const [sortMode, setSortMode] = useState<PlayerSortMode>(defaultSort);

  const sorted = useMemo(() => {
    const copy = [...players];
    switch (sortMode) {
      case "id":
        return copy.sort((a, b) => sortKey(a) - sortKey(b));
      case "name-asc":
        return copy.sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
        );
      case "name-desc":
        return copy.sort((a, b) =>
          b.displayName.localeCompare(a.displayName, undefined, { sensitivity: "base" }),
        );
      default:
        return copy;
    }
  }, [players, sortMode]);

  return [sorted, sortMode, setSortMode];
}

export function PlayerSortButtons({
  sortMode,
  onSortChange,
}: {
  sortMode: PlayerSortMode;
  onSortChange: (mode: PlayerSortMode) => void;
}) {
  return (
    <div
      className="player-sort-buttons"
      role="group"
      aria-label="Sort players"
    >
      <button
        type="button"
        className={sortMode === "id" ? "pill pill-small" : "sort-btn"}
        onClick={() => onSortChange("id")}
      >
        By ID
      </button>
      <button
        type="button"
        className={sortMode === "name-asc" ? "pill pill-small" : "sort-btn"}
        onClick={() => onSortChange("name-asc")}
      >
        A→Z
      </button>
      <button
        type="button"
        className={sortMode === "name-desc" ? "pill pill-small" : "sort-btn"}
        onClick={() => onSortChange("name-desc")}
      >
        Z→A
      </button>
    </div>
  );
}
