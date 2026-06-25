import {
  type FormEvent,
  useEffect,
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
import { SectionHeader } from "../features/ui/SectionHeader";
import { copy } from "../features/ui/copy";
import { adminWrite } from "../lib/api/admin";
import { fetchGames } from "../lib/api/read";
import { formatRelativeDate } from "../lib/format";

const GAMES_PAGE_SIZE = 10;

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
  const [page, setPage] = useState(0);
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

  const filteredGames = useMemo(() => {
    const games = gamesQuery.data ?? [];
    if (selectedGameType === "all") return games;
    return games.filter((g) => g.gameTypeId === selectedGameType);
  }, [gamesQuery.data, selectedGameType]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGames.length / GAMES_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pagedGames = filteredGames.slice(
    safePage * GAMES_PAGE_SIZE,
    (safePage + 1) * GAMES_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [selectedGameType]);

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [page, safePage]);

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
    onSuccess: async (_data, gameId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
        queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
      ]);
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
        <SectionHeader
          eyebrow="Sign in"
          title="Edit mode"
          subtitle={
            isAdmin ? copy.editMode.signedIn : "Unlock editing to create games and change scores"
          }
          status={
            <span className={isAdmin ? "pill pill-success" : "pill"}>
              {isAdmin ? copy.editMode.editing : copy.editMode.viewOnly}
            </span>
          }
        />

        {isAdmin ? (
          <div className="inline-actions">
            <button type="button" className="secondary-button" onClick={logout}>
              {copy.editMode.signOut}
            </button>
          </div>
        ) : (
          <form className="stack-sm" onSubmit={handleSubmit}>
            <label className="stack-xs" htmlFor="admin-password">
              <span>{copy.editMode.passwordLabel}</span>
              <input
                id="admin-password"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder={copy.editMode.passwordPlaceholder}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            {status === "checking" ? (
              <p className="muted">{copy.editMode.checkingSession}</p>
            ) : null}
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || status === "checking"}
            >
              {copy.editMode.unlock}
            </button>
          </form>
        )}
      </article>

      <article className="card stack-sm">
        <SectionHeader
          title={copy.games.title}
          actions={
            <button
              type="button"
              className="primary-button"
              disabled={!isAdmin}
              aria-label="Create new game"
              onClick={() => setCreateFormOpen((current) => !current)}
            >
              {copy.games.newGame}
            </button>
          }
        />

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
                {copy.common.cancel}
              </button>
            </div>
          </form>
        ) : null}

        {gamesQuery.isLoading ? <p className="muted">{copy.games.loading}</p> : null}
        {gamesQuery.error ? (
          <p className="form-error">{gamesQuery.error.message}</p>
        ) : null}
        {deleteGameMutation.error ? (
          <p className="form-error" role="alert">
            {deleteGameMutation.error.message}
          </p>
        ) : null}
        {!gamesQuery.isLoading && filteredGames.length === 0 ? (
          <p className="muted">
            {selectedGameType === "all"
              ? copy.games.emptyAll
              : copy.games.emptyFilter}
          </p>
        ) : null}

        <ul className="list-reset stack-sm">
          {pagedGames.map((game) => (
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
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const shouldDelete = window.confirm(
                      `Delete ${game.displayName}? ${copy.games.deleteConfirm}`,
                    );

                    if (!shouldDelete) {
                      return;
                    }

                    try {
                      await deleteGameMutation.mutateAsync(game.id);
                    } catch (deleteError) {
                      const message =
                        deleteError instanceof Error
                          ? deleteError.message
                          : "Could not delete this game.";
                      window.alert(message);
                    }
                  }}
                >
                  <IconGlyph name="trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {filteredGames.length > GAMES_PAGE_SIZE ? (
          <nav
            className="inline-actions space-between"
            aria-label="Games pagination"
          >
            <button
              type="button"
              className="secondary-button"
              disabled={safePage === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              {copy.games.previousPage}
            </button>
            <span className="muted">
              {copy.games.pageStatus(safePage + 1, totalPages)}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
            >
              {copy.games.nextPage}
            </button>
          </nav>
        ) : null}
      </article>
    </section>
  );
}
