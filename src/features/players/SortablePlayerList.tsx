import { useMemo, useState } from "react";

export type PlayerSortMode =
  | "id"
  | "name-asc"
  | "name-desc"
  | "points-desc"
  | "rounds-desc";

export type PlayerLike = {
  id?: number;
  playerId?: number;
  displayName: string;
  total?: number;
  /** Rounds played in the game players are being added to. */
  roundsPlayed?: number;
};

function sortKey(p: PlayerLike): number {
  return p.id ?? p.playerId ?? 0;
}

export function computeRoundCountsFromGameRounds(
  rounds: Array<{ entries: Array<{ playerId: number }> }>,
): Map<number, number> {
  const counts = new Map<number, number>();

  for (const round of rounds) {
    const seenInRound = new Set<number>();
    for (const entry of round.entries) {
      if (seenInRound.has(entry.playerId)) {
        continue;
      }
      seenInRound.add(entry.playerId);
      counts.set(entry.playerId, (counts.get(entry.playerId) ?? 0) + 1);
    }
  }

  return counts;
}

export function sortPlayers<T extends PlayerLike>(
  players: T[],
  sortMode: PlayerSortMode,
): T[] {
  const copy = [...players];
  switch (sortMode) {
    case "id":
      return copy.sort((a, b) => sortKey(a) - sortKey(b));
    case "name-asc":
      return copy.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );
    case "name-desc":
      return copy.sort((a, b) =>
        b.displayName.localeCompare(a.displayName, undefined, {
          sensitivity: "base",
        }),
      );
    case "points-desc":
      return copy.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    case "rounds-desc":
      return copy.sort((a, b) => {
        const byRounds = (b.roundsPlayed ?? 0) - (a.roundsPlayed ?? 0);
        if (byRounds !== 0) {
          return byRounds;
        }
        return sortKey(a) - sortKey(b);
      });
    default:
      return copy;
  }
}

export function useSortedPlayers<T extends PlayerLike>(
  players: T[],
  defaultSort: PlayerSortMode = "id",
): [T[], PlayerSortMode, (mode: PlayerSortMode) => void] {
  const [sortMode, setSortMode] = useState<PlayerSortMode>(defaultSort);

  const sorted = useMemo(
    () => sortPlayers(players, sortMode),
    [players, sortMode],
  );

  return [sorted, sortMode, setSortMode];
}

export type PlayerSortButtonsContext = "default" | "add-players";

export function PlayerSortButtons({
  sortMode,
  onSortChange,
  context = "default",
}: {
  sortMode: PlayerSortMode;
  onSortChange: (mode: PlayerSortMode) => void;
  context?: PlayerSortButtonsContext;
}) {
  return (
    <div
      className="player-sort-buttons"
      role="group"
      aria-label="Sort players"
    >
      {context === "add-players" ? (
        <button
          type="button"
          className={sortMode === "rounds-desc" ? "pill pill-small" : "sort-btn"}
          onClick={() => onSortChange("rounds-desc")}
        >
          rnds
        </button>
      ) : null}
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
      {context === "default" ? (
        <button
          type="button"
          className={
            sortMode === "points-desc" ? "pill pill-small" : "sort-btn"
          }
          onClick={() => onSortChange("points-desc")}
        >
          By points
        </button>
      ) : null}
    </div>
  );
}
