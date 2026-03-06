import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gameTypeOptions } from "../features/game-types";
import { fetchLeaderboards } from "../lib/api/read";
import { formatMoneyCents } from "../lib/format";

export function LeaderboardsPage() {
  const [selectedGameType, setSelectedGameType] = useState<
    "all" | "texas-holdem" | "fight-the-landlord"
  >("all");
  const leaderboardsQuery = useQuery({
    queryKey: ["leaderboards", selectedGameType],
    queryFn: () => fetchLeaderboards(selectedGameType),
  });
  const playerRows = leaderboardsQuery.data?.players ?? [];
  const familyRows = leaderboardsQuery.data?.families ?? [];

  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Leaderboards</p>
            <h2>Derived from saved history</h2>
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
                <th>Player</th>
                <th>Pts</th>
                <th>$</th>
                <th>Rnd W-L</th>
                <th>Game W-L</th>
              </tr>
            </thead>
            <tbody>
              {playerRows.map((row) => (
                <tr key={row.playerId}>
                  <td className="text-wrap-safe">{row.displayName}</td>
                  <td>{row.totalPoints}</td>
                  <td>{formatMoneyCents(row.totalMoneyCents)}</td>
                  <td>
                    {row.roundsWon}-{row.roundsLost}
                  </td>
                  <td>
                    {row.gamesWon}-{row.gamesLost}
                  </td>
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
            <h2>Grouped totals</h2>
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
                  <th>Family</th>
                  <th>Members</th>
                  <th>Pts</th>
                  <th>$</th>
                  <th>Rnd W-L</th>
                  <th>Game W-L</th>
                </tr>
              </thead>
              <tbody>
                {familyRows.map((family) => (
                  <tr key={family.familyId}>
                    <td className="text-wrap-safe">{family.familyName}</td>
                    <td>{family.memberNames.join(", ")}</td>
                    <td>{family.totalPoints}</td>
                    <td>{formatMoneyCents(family.totalMoneyCents)}</td>
                    <td>
                      {family.roundsWon}-{family.roundsLost}
                    </td>
                    <td>
                      {family.gamesWon}-{family.gamesLost}
                    </td>
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
