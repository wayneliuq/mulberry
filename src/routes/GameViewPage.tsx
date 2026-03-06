import { Link, useParams } from "react-router-dom";
import { useAdminSession } from "../features/admin/AdminSessionContext";

const activePlayers = [
  { id: "p1", name: "Player A", total: 14, locked: false },
  { id: "p2", name: "Player B", total: -5, locked: false },
  { id: "p3", name: "Player C", total: -9, locked: true },
];

export function GameViewPage() {
  const { gameId = "game" } = useParams();
  const { isAdmin } = useAdminSession();

  return (
    <section className="stack-lg">
      <div className="inline-actions space-between">
        <Link to="/" className="secondary-button link-button">
          Back to games
        </Link>
        <span className="pill">{isAdmin ? "Admin mode" : "Read only"}</span>
      </div>

      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Game view</p>
            <h2>{gameId}</h2>
          </div>
          <div className="inline-actions">
            <button type="button" className="secondary-button" disabled={!isAdmin}>
              New round
            </button>
            <button type="button" className="secondary-button" disabled={!isAdmin}>
              Add players
            </button>
            <button type="button" className="secondary-button" disabled={!isAdmin}>
              Game settings
            </button>
          </div>
        </div>

        <ul className="list-reset stack-sm">
          {activePlayers.map((player) => (
            <li key={player.id} className="list-item">
              <div className="stack-xs">
                <strong>{player.name}</strong>
                <p className="muted">
                  {player.locked ? "Locked for new rounds" : "Active"}
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
                  {player.total > 0 ? `+${player.total}` : player.total}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!isAdmin}
                >
                  {player.locked ? "Unlock" : "Lock"}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="inline-actions space-between">
          <strong>Game total: 0</strong>
          <button type="button" className="primary-button" disabled={!isAdmin}>
            Calculate $
          </button>
        </div>
      </article>

      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">History</p>
            <h2>Most recent first</h2>
          </div>
          <span className="pill">10 per page</span>
        </div>

        <ul className="list-reset stack-sm">
          <li className="list-item">
            <div className="stack-xs">
              <strong>Round 4</strong>
              <p className="muted">Player A +9, Player B -4, Player C -5</p>
            </div>
            <button type="button" className="icon-button" disabled={!isAdmin}>
              Delete
            </button>
          </li>
          <li className="list-item">
            <div className="stack-xs">
              <strong>Round 3</strong>
              <p className="muted">Player B +5, Player A -3, Player C -2</p>
            </div>
            <button type="button" className="icon-button" disabled={!isAdmin}>
              Delete
            </button>
          </li>
        </ul>
      </article>
    </section>
  );
}
