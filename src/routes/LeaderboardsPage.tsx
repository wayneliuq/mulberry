import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { gameTypeOptions } from "../features/game-types";
import type { GameTypeId } from "../features/game-types/types";
import { IconGlyph } from "../features/ui/IconGlyph";
import { copy } from "../features/ui/copy";
import { rankCellClass, scoreClassForSignedValue } from "../features/ui/tableDisplay";
import { RoundWinRateCell } from "../features/ui/RoundWinRateCell";
import { SectionHeader } from "../features/ui/SectionHeader";
import { BasketballSeasonToolbar } from "../features/basketball/BasketballSeasonToolbar";
import { useBasketballSeasons } from "../features/basketball/useBasketballSeasons";
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
  className,
  stickyName = false,
  hideOnNarrow = false,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn | null;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
  className?: string;
  stickyName?: boolean;
  hideOnNarrow?: boolean;
}) {
  const isActive = sortColumn === column;
  const thClass = [
    className,
    stickyName ? "th-sticky-name" : "",
    isActive ? "th-sort-active" : "",
    hideOnNarrow ? "col-hide-narrow" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <th
      scope="col"
      className={thClass || undefined}
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        className={isActive ? "sortable-th sortable-th-active" : "sortable-th"}
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        {isActive ? (
          <IconGlyph
            name={sortDir === "asc" ? "sort-asc" : "sort-desc"}
            size={12}
            className="sortable-th-icon"
            title={sortDir === "asc" ? "Sorted ascending" : "Sorted descending"}
          />
        ) : null}
      </button>
    </th>
  );
}

function RankCell({ rank }: { rank: number | undefined }) {
  return (
    <td className={rankCellClass(rank)}>
      <span className="rank-chip">{rank ?? "—"}</span>
    </td>
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

  const isBasketballLeaderboard = selectedGameType === "basketball";
  const {
    seasons,
    selectedSeasonId,
    setSelectedSeasonId,
    noticeText,
    seasonsQuery,
  } = useBasketballSeasons(isBasketballLeaderboard);

  const leaderboardsQuery = useQuery({
    queryKey: ["leaderboards", selectedGameType, selectedSeasonId],
    queryFn: () =>
      fetchLeaderboards(
        selectedGameType,
        isBasketballLeaderboard && selectedSeasonId != null
          ? { basketballSeasonId: selectedSeasonId }
          : undefined,
      ),
    enabled: !isBasketballLeaderboard || selectedSeasonId !== null,
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
        case "roundsWonPct": {
          const totalA = a.roundsWon + a.roundsLost;
          const totalB = b.roundsWon + b.roundsLost;
          const pctA = totalA > 0 ? a.roundsWon / totalA : 0;
          const pctB = totalB > 0 ? b.roundsWon / totalB : 0;
          cmp = pctA - pctB;
          if (cmp === 0) {
            cmp = totalA - totalB;
          }
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
        case "roundsWonPct": {
          const totalA = a.roundsWon + a.roundsLost;
          const totalB = b.roundsWon + b.roundsLost;
          const pctA = totalA > 0 ? a.roundsWon / totalA : 0;
          const pctB = totalB > 0 ? b.roundsWon / totalB : 0;
          cmp = pctA - pctB;
          if (cmp === 0) {
            cmp = totalA - totalB;
          }
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

  return (
    <section className="stack-lg">
      {isBasketballLeaderboard ? (
        <BasketballSeasonToolbar
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={setSelectedSeasonId}
          noticeText={noticeText}
          isLoading={seasonsQuery.isLoading}
        />
      ) : null}
      <article className="card stack-sm">
        <SectionHeader
          eyebrow={copy.leaderboards.eyebrow}
          title={copy.leaderboards.title}
        />
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
              <span>{copy.leaderboards.showMoney}</span>
            </label>
          </div>

        {leaderboardsQuery.isLoading ? (
          <p className="muted">{copy.leaderboards.loading}</p>
        ) : null}
        {leaderboardsQuery.error ? (
          <p className="form-error">{leaderboardsQuery.error.message}</p>
        ) : null}

        {!leaderboardsQuery.isLoading &&
        !leaderboardsQuery.error &&
        playerRows.length === 0 ? (
          <p className="muted">{copy.leaderboards.emptyPlayers}</p>
        ) : null}

        <div className="standings-table-container">
          <table className="standings-table">
            <thead>
              <tr>
                <th scope="col" className="th-rank numeric">
                  #
                </th>
                <SortableTh
                  label="Player"
                  column="displayName"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                  stickyName
                />
                <SortableTh
                  label="Pts"
                  column="totalPoints"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                  className="numeric"
                />
                {showMoney ? (
                  <SortableTh
                    label="$"
                    column="totalMoneyCents"
                    sortColumn={playerSort.column}
                    sortDir={playerSort.dir}
                    onSort={handlePlayerSort}
                    className="numeric"
                  />
                ) : null}
                <SortableTh
                  label={copy.leaderboards.winRate}
                  column="roundsWonPct"
                  sortColumn={playerSort.column}
                  sortDir={playerSort.dir}
                  onSort={handlePlayerSort}
                  className="numeric th-win-rate"
                />
              </tr>
            </thead>
            <tbody>
              {playerRows.map((row) => {
                const rank = playerPointsRankById.get(String(row.playerId));
                return (
                  <tr key={row.playerId}>
                    <RankCell rank={rank} />
                    <td className="text-wrap-safe td-primary td-sticky-name">
                      {row.displayName}
                    </td>
                    <td className="numeric">
                      <span className={scoreClassForSignedValue(row.totalPoints)}>
                        {formatPoints(row.totalPoints)}
                      </span>
                    </td>
                    {showMoney ? (
                      <td className="numeric">
                        {formatMoneyCents(row.totalMoneyCents)}
                      </td>
                    ) : null}
                    <td className="numeric td-win-rate">
                      <RoundWinRateCell row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card stack-sm">
        <SectionHeader
          eyebrow={copy.leaderboards.familiesEyebrow}
          title={copy.leaderboards.familiesEyebrow}
          status={<span className="pill">{familyRows.length} families</span>}
        />

        {familyRows.length === 0 ? (
          <p className="muted">{copy.leaderboards.familiesEmpty}</p>
        ) : (
          <div className="standings-table-container">
            <table className="standings-table">
              <thead>
                <tr>
                  <th scope="col" className="th-rank numeric">
                    #
                  </th>
                  <SortableTh
                    label="Family"
                    column="displayName"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                    stickyName
                  />
                  <th scope="col">Members</th>
                  <SortableTh
                    label="Pts"
                    column="totalPoints"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                    className="numeric"
                  />
                  {showMoney ? (
                    <SortableTh
                      label="$"
                      column="totalMoneyCents"
                      sortColumn={familySort.column}
                      sortDir={familySort.dir}
                      onSort={handleFamilySort}
                      className="numeric"
                    />
                  ) : null}
                  <SortableTh
                    label={copy.leaderboards.winRate}
                    column="roundsWonPct"
                    sortColumn={familySort.column}
                    sortDir={familySort.dir}
                    onSort={handleFamilySort}
                    className="numeric th-win-rate"
                  />
                </tr>
              </thead>
              <tbody>
                {familyRows.map((family) => {
                  const rank = familyPointsRankById.get(family.familyId);
                  return (
                    <tr key={family.familyId}>
                      <RankCell rank={rank} />
                      <td className="text-wrap-safe td-primary td-sticky-name">
                        {family.familyName}
                      </td>
                      <td className="text-wrap-safe td-secondary">
                        <span className="members-cell-clamp">
                          {family.memberNames.join(", ")}
                        </span>
                      </td>
                      <td className="numeric">
                        <span className={scoreClassForSignedValue(family.totalPoints)}>
                          {formatPoints(family.totalPoints)}
                        </span>
                      </td>
                      {showMoney ? (
                        <td className="numeric">
                          {formatMoneyCents(family.totalMoneyCents)}
                        </td>
                      ) : null}
                      <td className="numeric td-win-rate">
                        <RoundWinRateCell row={family} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

    </section>
  );
}
