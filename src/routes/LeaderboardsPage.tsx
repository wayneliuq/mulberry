import { gameTypeOptions } from "../features/game-types";

const leaderboardRows = [
  {
    name: "Player A",
    points: 42,
    roundRecord: "8-2",
    gameRecord: "3-1",
  },
  {
    name: "Player B",
    points: -13,
    roundRecord: "3-7",
    gameRecord: "1-3",
  },
];

export function LeaderboardsPage() {
  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Leaderboards</p>
            <h2>Derived from saved history</h2>
          </div>
          <div className="filter-row" role="tablist" aria-label="Game filters">
            <button type="button" className="filter-chip filter-chip-active">
              All
            </button>
            {gameTypeOptions.map((option) => (
              <button key={option.id} type="button" className="filter-chip">
                {option.name}
              </button>
            ))}
          </div>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Pts</th>
                <th>Rnd W-L</th>
                <th>Game W-L</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.points}</td>
                  <td>{row.roundRecord}</td>
                  <td>{row.gameRecord}</td>
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
            <h2>Grouped totals preview</h2>
          </div>
          <span className="pill">Roadmap phase 4</span>
        </div>

        <p className="muted">
          This screen is wired for the eventual derived family leaderboard and
          will stay read-only for public visitors.
        </p>
      </article>
    </section>
  );
}
