import {
  type FormEvent,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAdminSession } from "../features/admin/AdminSessionContext";
import { gameTypeOptions, getGameTypeOption } from "../features/game-types";
import type { GameTypeId } from "../features/game-types/types";
import { IconGlyph } from "../features/ui/IconGlyph";
import { adminWrite } from "../lib/api/admin";
import { fetchGames } from "../lib/api/read";
import { formatRelativeDate } from "../lib/format";

export function GamesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    error,
    isAdmin,
    isSubmitting,
    login,
    logout,
    password,
    status,
  } =
    useAdminSession();
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedGameType, setSelectedGameType] = useState<GameTypeId | "all">(
    "all",
  );
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createGameValues, setCreateGameValues] = useState({
    gameTypeId: "texas-holdem",
    pointBasis: "1",
    moneyPerPointCents: "0",
    displayName: "",
  });

  const gamesQuery = useQuery({
    queryKey: ["games"],
    queryFn: fetchGames,
  });

  const recentGames = useMemo(() => {
    const games = gamesQuery.data ?? [];
    if (selectedGameType === "all") return games;
    return games.filter((g) => g.gameTypeId === selectedGameType);
  }, [gamesQuery.data, selectedGameType]);

  const createGameMutation = useMutation({
    mutationFn: async () => {
      if (!password) {
        throw new Error("Admin session has expired. Please log in again.");
      }

      return adminWrite<
        "create_game",
        { game: { id: string } }
      >({
        action: "create_game",
        password,
        gameTypeId: createGameValues.gameTypeId as GameTypeId,
        pointBasis:
          createGameValues.gameTypeId === "dixit" ||
          createGameValues.gameTypeId === "basketball"
            ? 1
            : Number(createGameValues.pointBasis),
        moneyPerPointCents: Number(createGameValues.moneyPerPointCents),
        displayName: createGameValues.displayName.trim() || undefined,
      });
    },
    onSuccess: async (response) => {
      if (!response?.game?.id) {
        throw new Error("The game was created, but no id was returned.");
      }

      await queryClient.invalidateQueries({ queryKey: ["games"] });
      setCreateFormOpen(false);
      setCreateGameValues({
        gameTypeId: "texas-holdem",
        pointBasis: "1",
        moneyPerPointCents: "0",
        displayName: "",
      });
      navigate(`/games/${response.game.id}`);
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      if (!password) {
        throw new Error("Admin session has expired. Please log in again.");
      }

      return adminWrite({
        action: "delete_game",
        password,
        gameId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["games"] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboards"] });
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordInput.trim()) {
      return;
    }

    const loggedIn = await login(passwordInput.trim());

    if (loggedIn) {
      setPasswordInput("");
    }
  }

  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Admin access</p>
          </div>
          <span className={isAdmin ? "pill pill-success" : "pill"}>
            {isAdmin ? "Editing enabled" : "View only"}
          </span>
        </div>

        {isAdmin ? (
          <div className="inline-actions">
            <p className="muted">Admin logged in</p>
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
            {error ? <p className="form-error">{error}</p> : null}
            {status === "checking" ? (
              <p className="muted">Checking saved admin session...</p>
            ) : null}
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || status === "checking"}
            >
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
            onClick={() => setCreateFormOpen((current) => !current)}
          >
            New game
          </button>
        </div>

        <div className="filter-row" role="tablist" aria-label="Game type filters">
          <button
            type="button"
            className={
              selectedGameType === "all"
                ? "filter-toggle filter-toggle-active"
                : "filter-toggle"
            }
            onClick={() => setSelectedGameType("all")}
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
              onClick={() => setSelectedGameType(option.id)}
            >
              <IconGlyph name={option.icon} className="filter-toggle-icon" />
              <span className="filter-toggle-label">{option.name}</span>
            </button>
          ))}
        </div>

        {createFormOpen ? (
          <form
            className="card-subsection stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void createGameMutation.mutateAsync();
            }}
          >
            <label className="stack-xs">
              <span>Game type</span>
              <select
                value={createGameValues.gameTypeId}
                onChange={(event) => {
                  const gameTypeId = event.target.value as GameTypeId;
                  setCreateGameValues((current) => ({
                    ...current,
                    gameTypeId,
                    pointBasis:
                      gameTypeId === "dixit" || gameTypeId === "basketball"
                        ? "1"
                        : current.pointBasis,
                  }));
                }}
              >
                {gameTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack-xs">
              <span>Display name</span>
              <input
                maxLength={25}
                value={createGameValues.displayName}
                onChange={(event) =>
                  setCreateGameValues((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder="Optional custom name"
              />
            </label>

            <div className="form-grid">
              {createGameValues.gameTypeId !== "dixit" &&
              createGameValues.gameTypeId !== "basketball" ? (
                <label className="stack-xs">
                  <span>Point basis</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={createGameValues.pointBasis}
                    onChange={(event) =>
                      setCreateGameValues((current) => ({
                        ...current,
                        pointBasis: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}

              <label className="stack-xs">
                <span>Money per point (cents)</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={createGameValues.moneyPerPointCents}
                  onChange={(event) =>
                    setCreateGameValues((current) => ({
                      ...current,
                      moneyPerPointCents: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            {createGameMutation.error ? (
              <p className="form-error">{createGameMutation.error.message}</p>
            ) : null}

            <div className="inline-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={createGameMutation.isPending}
              >
                Create game
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCreateFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {gamesQuery.isLoading ? <p className="muted">Loading games...</p> : null}
        {gamesQuery.error ? (
          <p className="form-error">{gamesQuery.error.message}</p>
        ) : null}
        {!gamesQuery.isLoading && recentGames.length === 0 ? (
          <p className="muted">
            {selectedGameType === "all"
              ? "No games yet. Create the first one as admin."
              : "No games of this type."}
          </p>
        ) : null}

        <ul className="list-reset stack-sm">
          {recentGames.map((game) => (
            <li key={game.id} className="list-item game-row-tappable">
              <Link
                to={`/games/${game.id}`}
                className="game-row-link"
                aria-label={`Open ${game.displayName}`}
              >
                <div className="stack-xs">
                  <div className="inline-actions">
                    <span className="game-link text-wrap-safe">
                      {game.displayName}
                    </span>
                    <span
                      className={
                        game.status === "settled"
                          ? "pill pill-success"
                          : "pill"
                      }
                    >
                      {game.status === "settled" ? "Settled" : "Ongoing"}
                    </span>
                  </div>
                  <p className="muted">
                    {getGameTypeOption(game.gameTypeId)?.name ?? game.gameTypeId} ·{" "}
                    {formatRelativeDate(game.updatedAt)} · {game.roundCount} rounds ·{" "}
                    {game.playerCount} players
                  </p>
                </div>
              </Link>
              <div className="inline-actions game-row-actions">
                <button
                  type="button"
                  className="icon-button"
                  disabled={!isAdmin}
                  aria-label={`Delete ${game.displayName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const shouldDelete = window.confirm(
                      `Delete ${game.displayName}? This removes its history and leaderboard impact.`,
                    );

                    if (!shouldDelete) {
                      return;
                    }

                    void deleteGameMutation.mutateAsync(game.id);
                  }}
                >
                  <IconGlyph name="trash" />
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
