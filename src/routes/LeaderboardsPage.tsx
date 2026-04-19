import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gameTypeOptions } from "../features/game-types";
import type { GameTypeId } from "../features/game-types/types";
import { fetchLeaderboards } from "../lib/api/read";
import { formatMoneyCents, formatPoints } from "../lib/format";
import type {
  FamilyLeaderboardRow,
  PlayerLeaderboardRow,
} from "../lib/api/types";

type SortColumn =
  | "displayName"
  | "totalPoints"
  | "totalMoneyCents"
  | "roundsWon"
  | "roundsWonPct";
type SortDir = "asc" | "desc";

function SortableTh({
  label,
  column,
  sortColumn,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn | null;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
}) {
  const isActive = sortColumn === column;
  return (
    <th>
      <button
        type="button"
        className="sortable-th"
        onClick={() => onSort(column)}
        aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      >
        {label}
        {isActive ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

export function LeaderboardsPage() {
  const [selectedGameType, setSelectedGameType] = useState<GameTypeId | "all">(
    "all",
  );
  const [playerSort, setPlayerSort] = useState<{
    column: SortColumn;
    dir: SortDir;
  }>({ column: "totalPoints", dir: "desc" });
  const [familySort, setFamilySort] = useState<{
    column: SortColumn;
    dir: SortDir;
  }>({ column: "totalPoints", dir: "desc" });

  const leaderboardsQuery = useQuery({
    queryKey: ["leaderboards", selectedGameType],
    queryFn: () => fetchLeaderboards(selectedGameType),
  });
  const rawPlayerRows = leaderboardsQuery.data?.players ?? [];
  const rawFamilyRows = leaderboardsQuery.data?.families ?? [];

  const playerRows = useMemo(() => {
    const rows = [...rawPlayerRows];
    const dir = playerSort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      switch (playerSort.column) {
        case "displayName":
          cmp = a.displayName.localeCompare(b.displayName, undefined, {
            sensitivity: "base",
          });
          break;
        case "totalPoints":
          cmp = a.totalPoints - b.totalPoints;
          break;
        case "totalMoneyCents":
          cmp = a.totalMoneyCents - b.totalMoneyCents;
          break;
        case "roundsWon":
          cmp = a.roundsWon - b.roundsWon;
          break;
        case "roundsWonPct": {
          const totalA = a.roundsWon + a.roundsLost;
          const totalB = b.roundsWon + b.roundsLost;
          const pctA = totalA > 0 ? a.roundsWon / totalA : 0;
          const pctB = totalB > 0 ? b.roundsWon / totalB : 0;
          cmp = pctA - pctB;
          break;
        }
        default:
          break;
      }
      return cmp * dir;
    });
    return rows;
  }, [rawPlayerRows, playerSort]);

  const familyRows = useMemo(() => {
    const rows = [...rawFamilyRows];
    const dir = familySort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      switch (familySort.column) {
        case "displayName":
          cmp = a.familyName.localeCompare(b.familyName, undefined, {
            sensitivity: "base",
          });
          break;
        case "totalPoints":
          cmp = a.totalPoints - b.totalPoints;
          break;
        case "totalMoneyCents":
          cmp = a.totalMoneyCents - b.totalMoneyCents;
          break;
        case "roundsWon":
          cmp = a.roundsWon - b.roundsWon;
          break;
        case "roundsWonPct": {
          const totalA = a.roundsWon + a.roundsLost;
          const totalB = b.roundsWon + b.roundsLost;
          const pctA = totalA > 0 ? a.roundsWon / totalA : 0;
          const pctB = totalB > 0 ? b.roundsWon / totalB : 0;
          cmp = pctA - pctB;
          break;
        }
        default:
          break;
      }
      return cmp * dir;
    });
    return rows;
  }, [rawFamilyRows, familySort]);

  function handlePlayerSort(column: SortColumn) {
    setPlayerSort((prev) => ({
      column,
      dir:
        prev.column === column && prev.dir === "desc" ? "asc" : "desc",
    }));
  }

  function handleFamilySort(column: SortColumn) {
    setFamilySort((prev) => ({
      column,
      dir:
        prev.column === column && prev.dir === "desc" ? "asc" : "desc",
    }));
  }

  function formatRndWonPct(row: PlayerLeaderboardRow | FamilyLeaderboardRow) {
    const total = row.roundsWon + row.roundsLost;
    if (total === 0) return "—";
    return `${Math.round((row.roundsWon / total) * 100)}%`;
  }

  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Leaderboards</p>
          </div>
          <div className="filter-row" role="tablist" aria-label="Game filters">
            <button
              type="button"
              className={
                selectedGameType === "all"
                  ? "filter-chip filter-chip-active"
                  : "filter-chip"
              }
              onClick={() => setSelectedGameType("all")}
            >
              All
            </button>
            {gameTypeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  selectedGameType === option.id
                    ? "filter-chip filter-chip-active"
                    : "filter-chip"
                }
                onClick={() => setSelectedGameType(option.id)}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>

        {leaderboardsQuery.isLoading ? (
          <p className="muted">Loading leaderboards...</p>
        ) : null}
        {leaderboardsQuery.error ? (
          <p className="form-error">{leaderboardsQuery.error.message}</p>
        ) : null}

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <SortableTh
                  label="Player"
                  column="displayName"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                />
                <SortableTh
                  label="Pts"
                  column="totalPoints"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                />
                <SortableTh
                  label="$"
                  column="totalMoneyCents"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                />
                <SortableTh
                  label="Rnd W-L"
                  column="roundsWon"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                />
                <SortableTh
                  label="Rnd W-L (%)"
                  column="roundsWonPct"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                />
              </tr>
            </thead>
            <tbody>
              {playerRows.map((row) => (
                <tr key={row.playerId}>
                  <td className="text-wrap-safe">{row.displayName}</td>
                  <td>{formatPoints(row.totalPoints)}</td>
                  <td>{formatMoneyCents(row.totalMoneyCents)}</td>
                  <td>
                    {row.roundsWon}-{row.roundsLost}
                  </td>
                  <td>{formatRndWonPct(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Families</p>
          </div>
          <span className="pill">{familyRows.length} families</span>
        </div>

        {familyRows.length === 0 ? (
          <p className="muted">
            Families appear here once at least two players share the same family.
          </p>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <SortableTh
                    label="Family"
                    column="displayName"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                  />
                  <th>Members</th>
                  <SortableTh
                    label="Pts"
                    column="totalPoints"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                  />
                  <SortableTh
                    label="$"
                    column="totalMoneyCents"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                  />
                  <SortableTh
                    label="Rnd W-L"
                    column="roundsWon"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                  />
                  <SortableTh
                    label="Rnd W-L (%)"
                    column="roundsWonPct"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                  />
                </tr>
              </thead>
              <tbody>
                {familyRows.map((family) => (
                  <tr key={family.familyId}>
                    <td className="text-wrap-safe">{family.familyName}</td>
                    <td>{family.memberNames.join(", ")}</td>
                    <td>{formatPoints(family.totalPoints)}</td>
                    <td>{formatMoneyCents(family.totalMoneyCents)}</td>
                    <td>
                      {family.roundsWon}-{family.roundsLost}
                    </td>
                    <td>{formatRndWonPct(family)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

    </section>
  );
}
