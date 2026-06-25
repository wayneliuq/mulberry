import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AdminSessionProvider } from "../features/admin/AdminSessionContext";
import { adminWrite, verifyAdminPassword } from "../lib/api/admin";
import { fetchGames } from "../lib/api/read";
import type { GameSummary } from "../lib/api/types";
import { GamesPage } from "./GamesPage";

vi.mock("../lib/api/read", () => ({
  fetchGames: vi.fn(),
}));

vi.mock("../lib/api/admin", () => ({
  verifyAdminPassword: vi.fn(),
  adminWrite: vi.fn(),
}));

const fetchGamesMock = vi.mocked(fetchGames);
const verifyAdminPasswordMock = vi.mocked(verifyAdminPassword);
const adminWriteMock = vi.mocked(adminWrite);

function makeGames(count: number, gameTypeId: GameSummary["gameTypeId"] = "texas-holdem"): GameSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `game-${index + 1}`,
    displayName: `Game ${index + 1}`,
    gameTypeId,
    status: "open" as const,
    createdAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    updatedAt: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    roundCount: 1,
    playerCount: 4,
  }));
}

function renderGamesPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <MemoryRouter>
          <GamesPage />
        </MemoryRouter>
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}

function gameLinks(namePattern: RegExp = /^Open Game /) {
  return screen.getAllByRole("link", { name: namePattern });
}

describe("GamesPage", () => {
  beforeEach(() => {
    fetchGamesMock.mockResolvedValue([]);
    verifyAdminPasswordMock.mockResolvedValue(undefined);
    adminWriteMock.mockReset();
    window.localStorage.setItem("mulberry.admin-password", "test-password");
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows the Games section title", async () => {
    renderGamesPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Games", level: 2 })).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Recent games" })).not.toBeInTheDocument();
  });

  it("shows 10 games per page and paginates with next and previous", async () => {
    const user = userEvent.setup();
    fetchGamesMock.mockResolvedValue(makeGames(25));
    renderGamesPage();

    await waitFor(() => {
      expect(gameLinks()).toHaveLength(10);
    });
    expect(gameLinks()[0]).toHaveAccessibleName("Open Game 1");
    expect(gameLinks()[9]).toHaveAccessibleName("Open Game 10");

    const pagination = screen.getByRole("navigation", { name: "Games pagination" });
    await user.click(within(pagination).getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(gameLinks()[0]).toHaveAccessibleName("Open Game 11");
    });
    expect(gameLinks()).toHaveLength(10);
    expect(gameLinks()[9]).toHaveAccessibleName("Open Game 20");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    await user.click(within(pagination).getByRole("button", { name: "Previous" }));

    await waitFor(() => {
      expect(gameLinks()[0]).toHaveAccessibleName("Open Game 1");
    });
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("resets to page 1 when the game type filter changes", async () => {
    const user = userEvent.setup();
    const mixedGames = [
      ...makeGames(12, "texas-holdem"),
      ...makeGames(5, "basketball").map((game, index) => ({
        ...game,
        id: `basketball-${index + 1}`,
        displayName: `Basketball ${index + 1}`,
      })),
    ];
    fetchGamesMock.mockResolvedValue(mixedGames);
    renderGamesPage();

    await waitFor(() => {
      expect(gameLinks()).toHaveLength(10);
    });

    const pagination = screen.getByRole("navigation", { name: "Games pagination" });
    await user.click(within(pagination).getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Basketball" }));

    await waitFor(() => {
      expect(gameLinks(/^Open Basketball /)).toHaveLength(5);
    });
    expect(screen.queryByRole("navigation", { name: "Games pagination" })).not.toBeInTheDocument();
    expect(gameLinks(/^Open Basketball /)[0]).toHaveAccessibleName("Open Basketball 1");
  });

  it("hides pagination when there are 10 or fewer games", async () => {
    fetchGamesMock.mockResolvedValue(makeGames(10));
    renderGamesPage();

    await waitFor(() => {
      expect(gameLinks()).toHaveLength(10);
    });
    expect(screen.queryByRole("navigation", { name: "Games pagination" })).not.toBeInTheDocument();
  });

  it("deletes a game when admin confirms", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    adminWriteMock.mockResolvedValue({ deletedGameId: "game-1" });
    fetchGamesMock.mockResolvedValue(makeGames(1, "basketball"));

    renderGamesPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete Game 1" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Delete Game 1" }));

    await waitFor(() => {
      expect(adminWriteMock).toHaveBeenCalledWith({
        action: "delete_game",
        password: "test-password",
        gameId: "game-1",
      });
    });

    expect(alertSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("surfaces delete failures to the user", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    adminWriteMock.mockRejectedValue(new Error("Game not found or could not be deleted."));
    fetchGamesMock.mockResolvedValue(makeGames(1, "texas-holdem"));

    renderGamesPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete Game 1" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Delete Game 1" }));

    await waitFor(() => {
      expect(
        screen.getByText("Game not found or could not be deleted."),
      ).toBeInTheDocument();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      "Game not found or could not be deleted.",
    );
    alertSpy.mockRestore();
  });
});
