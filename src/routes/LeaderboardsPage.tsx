import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { gameTypeOptions } from "../features/game-types";
import type { GameTypeId } from "../features/game-types/types";
import { IconGlyph } from "../features/ui/IconGlyph";
import { fetchLeaderboards } from "../lib/api/read";
import { formatMoneyCents, formatPoints } from "../lib/format";
import type {
  FamilyLeaderboardRow,
  PlayerLeaderboardRow,
} from "../lib/api/types";

const SHOW_MONEY_STORAGE_KEY = "mulberry.leaderboards.show-money";

type SortColumn =
  | "displayName"
  | "totalPoints"
  | "totalMoneyCents"
  | "roundsWon"
  | "roundsWonPct";
type SortDir = "asc" | "desc";

function readShowMoneyFromStorage(): boolean {
  try {
    return window.localStorage.getItem(SHOW_MONEY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeShowMoneyToStorage(value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(SHOW_MONEY_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(SHOW_MONEY_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Competition ranking by totalPoints descending (1, 2, 2, 4). */
function buildPointsRankMap<T extends { totalPoints: number }>(
  rows: T[],
  getKey: (row: T) => string,
): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.totalPoints - a.totalPoints);
  const map = new Map<string, number>();
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    if (i > 0 && row.totalPoints !== sorted[i - 1]!.totalPoints) {
      rank = i + 1;
    }
    map.set(getKey(row), rank);
  }
  return map;
}

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
  const { gameTypeId: gameTypeParam } = useParams<{ gameTypeId?: string }>();
  const navigate = useNavigate();
  const selectedGameType = useMemo<GameTypeId | "all">(() => {
    if (!gameTypeParam || gameTypeParam === "all") {
      return "all";
    }
    const valid = gameTypeOptions.some((option) => option.id === gameTypeParam);
    return valid ? (gameTypeParam as GameTypeId) : "all";
  }, [gameTypeParam]);
  const [showMoney, setShowMoney] = useState(readShowMoneyFromStorage);
  const [playerSort, setPlayerSort] = useState<{
    column: SortColumn;
    dir: SortDir;
  }>({ column: "totalPoints", dir: "desc" });
  const [familySort, setFamilySort] = useState<{
    column: SortColumn;
    dir: SortDir;
  }>({ column: "totalPoints", dir: "desc" });

  const handleShowMoneyChange = useCallback(
    (next: boolean) => {
      setShowMoney(next);
      writeShowMoneyToStorage(next);
    },
    [],
  );

  useEffect(() => {
    if (!gameTypeParam || gameTypeParam === "all") {
      return;
    }
    const valid = gameTypeOptions.some((option) => option.id === gameTypeParam);
    if (!valid) {
      navigate("/leaderboards", { replace: true });
    }
  }, [gameTypeParam, navigate]);

  const navigateToFilter = useCallback(
    (gameType: GameTypeId | "all") => {
      navigate(gameType === "all" ? "/leaderboards" : `/leaderboards/${gameType}`);
    },
    [navigate],
  );

  const leaderboardsQuery = useQuery({
    queryKey: ["leaderboards", selectedGameType],
    queryFn: () => fetchLeaderboards(selectedGameType),
  });
  const rawPlayerRows = leaderboardsQuery.data?.players ?? [];
  const rawFamilyRows = leaderboardsQuery.data?.families ?? [];

  const familiesWithRounds = useMemo(
    () =>
      rawFamilyRows.filter((row) => row.roundsWon + row.roundsLost > 0),
    [rawFamilyRows],
  );

  const playerPointsRankById = useMemo(
    () =>
      buildPointsRankMap(rawPlayerRows, (row) => String(row.playerId)),
    [rawPlayerRows],
  );

  const familyPointsRankById = useMemo(
    () =>
      buildPointsRankMap(familiesWithRounds, (row) => row.familyId),
    [familiesWithRounds],
  );

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
    const rows = [...familiesWithRounds];
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
  }, [familiesWithRounds, familySort]);

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
        <div className="card-header leaderboard-card-header">
          <div>
            <p className="card-eyebrow">Leaderboards</p>
          </div>
          <div className="stack-xs leaderboard-header-controls">
            <div className="filter-row" role="tablist" aria-label="Game filters">
              <button
                type="button"
                className={
                  selectedGameType === "all"
                    ? "filter-toggle filter-toggle-active"
                    : "filter-toggle"
                }
                onClick={() => navigateToFilter("all")}
              >
                <IconGlyph name="all" className="filter-toggle-icon" />
                <span className="filter-toggle-label">All</span>
              </button>
              {gameTypeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={
                    selectedGameType === option.id
                      ? "filter-toggle filter-toggle-active"
                      : "filter-toggle"
                  }
                  onClick={() => navigateToFilter(option.id)}
                >
                  <IconGlyph name={option.icon} className="filter-toggle-icon" />
                  <span className="filter-toggle-label">{option.name}</span>
                </button>
              ))}
            </div>
            <label className="leaderboard-show-money">
              <input
                type="checkbox"
                checked={showMoney}
                onChange={(event) =>
                  handleShowMoneyChange(event.target.checked)
                }
              />
              <span>Show $</span>
            </label>
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
                <th scope="col" className="th-rank">
                  #
                </th>
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
                {showMoney ? (
                  <SortableTh
                    label="$"
                    column="totalMoneyCents"
                    sortColumn={playerSort.column}
                    sortDir={playerSort.dir}
                    onSort={handlePlayerSort}
                  />
                ) : null}
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
                  <td className="td-rank">
                    {playerPointsRankById.get(String(row.playerId)) ?? "—"}
                  </td>
                  <td className="text-wrap-safe">{row.displayName}</td>
                  <td>{formatPoints(row.totalPoints)}</td>
                  {showMoney ? (
                    <td>{formatMoneyCents(row.totalMoneyCents)}</td>
                  ) : null}
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
                  <th scope="col" className="th-rank">
                    #
                  </th>
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
                  {showMoney ? (
                    <SortableTh
                      label="$"
                      column="totalMoneyCents"
                      sortColumn={familySort.column}
                      sortDir={familySort.dir}
                      onSort={handleFamilySort}
                    />
                  ) : null}
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
                    <td className="td-rank">
                      {familyPointsRankById.get(family.familyId) ?? "—"}
                    </td>
                    <td className="text-wrap-safe">{family.familyName}</td>
                    <td className="text-wrap-safe members-cell-clamp">
                      {family.memberNames.join(", ")}
                    </td>
                    <td>{formatPoints(family.totalPoints)}</td>
                    {showMoney ? (
                      <td>{formatMoneyCents(family.totalMoneyCents)}</td>
                    ) : null}
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
