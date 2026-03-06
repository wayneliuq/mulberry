import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminSession } from "../features/admin/AdminSessionContext";
import { gameTypeOptions } from "../features/game-types";

const recentGames = [
  {
    id: "holdem-2026-03-06",
    title: "Texas Hold'em on Mar 6, 2026",
    updatedAt: "Updated 10 minutes ago",
    status: "Open",
  },
  {
    id: "landlord-2026-03-01",
    title: "Fight the Landlord on Mar 1, 2026",
    updatedAt: "Updated 5 days ago",
    status: "Settled",
  },
];

export function GamesPage() {
  const { isAdmin, login, logout } = useAdminSession();
  const [passwordInput, setPasswordInput] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordInput.trim()) {
      return;
    }

    login(passwordInput.trim());
    setPasswordInput("");
  }

  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Admin access</p>
            <h2>Public read, admin write</h2>
          </div>
          <span className={isAdmin ? "pill pill-success" : "pill"}>
            {isAdmin ? "Editing enabled" : "View only"}
          </span>
        </div>

        {isAdmin ? (
          <div className="inline-actions">
            <p className="muted">
              Admin mode is currently stored locally for this browser session.
            </p>
            <button type="button" className="secondary-button" onClick={logout}>
              Log out
            </button>
          </div>
        ) : (
          <form className="stack-sm" onSubmit={handleSubmit}>
            <label className="stack-xs" htmlFor="admin-password">
              <span>Shared admin password</span>
              <input
                id="admin-password"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Enter password"
              />
            </label>
            <button type="submit" className="primary-button">
              Unlock admin actions
            </button>
          </form>
        )}
      </article>

      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Games</p>
            <h2>Recent games</h2>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={!isAdmin}
            aria-label="Create new game"
          >
            New game
          </button>
        </div>

        <div className="filter-row" aria-label="Supported game types">
          {gameTypeOptions.map((option) => (
            <span key={option.id} className="pill">
              {option.name}
            </span>
          ))}
        </div>

        <ul className="list-reset stack-sm">
          {recentGames.map((game) => (
            <li key={game.id} className="list-item">
              <div className="stack-xs">
                <Link to={`/games/${game.id}`} className="game-link">
                  {game.title}
                </Link>
                <p className="muted">{game.updatedAt}</p>
              </div>
              <div className="inline-actions">
                <span className="pill">{game.status}</span>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!isAdmin}
                  aria-label={`Delete ${game.title}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="inline-actions space-between">
          <p className="muted">Page 1 of 1</p>
          <button type="button" className="secondary-button" disabled>
            Next page
          </button>
        </div>
      </article>
    </section>
  );
}
