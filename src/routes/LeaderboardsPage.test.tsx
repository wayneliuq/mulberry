import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { AdminSessionProvider } from "../features/admin/AdminSessionContext";
import { fetchBasketballSeasons, fetchLeaderboards } from "../lib/api/read";
import type { LeaderboardData } from "../lib/api/types";
import { LeaderboardsPage } from "./LeaderboardsPage";

vi.mock("../lib/api/read", () => ({
  fetchLeaderboards: vi.fn(),
  fetchBasketballSeasons: vi.fn(),
}));

const fetchLeaderboardsMock = vi.mocked(fetchLeaderboards);
const fetchBasketballSeasonsMock = vi.mocked(fetchBasketballSeasons);

function renderLeaderboards(initialEntry: string = "/leaderboards") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route
              path="/leaderboards/:gameTypeId"
              element={<LeaderboardsPage />}
            />
          </Routes>
        </MemoryRouter>
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}

const samplePlayers: LeaderboardData["players"] = [
  {
    playerId: 1,
    displayName: "Delta",
    familyId: null,
    totalPoints: 80,
    totalMoneyCents: 100,
    roundsWon: 1,
    roundsLost: 1,
    gamesWon: 0,
    gamesLost: 0,
  },
  {
    playerId: 2,
    displayName: "Bravo",
    familyId: null,
    totalPoints: 90,
    totalMoneyCents: 200,
    roundsWon: 2,
    roundsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  },
  {
    playerId: 3,
    displayName: "Charlie",
    familyId: null,
    totalPoints: 90,
    totalMoneyCents: 300,
    roundsWon: 1,
    roundsLost: 1,
    gamesWon: 0,
    gamesLost: 0,
  },
  {
    playerId: 4,
    displayName: "Alpha",
    familyId: null,
    totalPoints: 100,
    totalMoneyCents: 400,
    roundsWon: 3,
    roundsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  },
];

const sampleFamilies: LeaderboardData["families"] = [
  {
    familyId: "f1",
    familyName: "Family Low",
    memberNames: ["A"],
    totalPoints: 50,
    totalMoneyCents: 50,
    roundsWon: 1,
    roundsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  },
  {
    familyId: "f2",
    familyName: "Family Tie A",
    memberNames: ["B", "C"],
    totalPoints: 120,
    totalMoneyCents: 120,
    roundsWon: 2,
    roundsLost: 1,
    gamesWon: 0,
    gamesLost: 0,
  },
  {
    familyId: "f3",
    familyName: "Family Tie B",
    memberNames: ["D"],
    totalPoints: 120,
    totalMoneyCents: 130,
    roundsWon: 1,
    roundsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  },
  {
    familyId: "f4",
    familyName: "Family Top",
    memberNames: ["E"],
    totalPoints: 200,
    totalMoneyCents: 200,
    roundsWon: 3,
    roundsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  },
];

describe("LeaderboardsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchLeaderboardsMock.mockReset();
    fetchBasketballSeasonsMock.mockReset();
    fetchLeaderboardsMock.mockResolvedValue({
      players: samplePlayers,
      families: sampleFamilies,
    });
    // Default: no seasons loaded (activeSeasonId === null → filter off).
    fetchBasketballSeasonsMock.mockResolvedValue({
      seasons: [],
      activeSeasonId: 0 as unknown as number,
    });
  });

  it("hides $ column by default and shows it when Show $ is toggled", async () => {
    const user = userEvent.setup();
    renderLeaderboards();

    await screen.findByRole("columnheader", { name: "Player" });

    expect(
      screen.queryByRole("columnheader", { name: "$" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /show money/i }));

    expect(
      screen.getAllByRole("columnheader", { name: "$" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("persists Show $ from localStorage on mount", async () => {
    window.localStorage.setItem("mulberry.leaderboards.show-money", "true");
    renderLeaderboards();

    await screen.findByRole("columnheader", { name: "$" });

    expect(screen.getByRole("checkbox", { name: /show money/i })).toBeChecked();
  });

  it("writes Show $ preference to localStorage when toggled", async () => {
    const user = userEvent.setup();
    renderLeaderboards();

    await screen.findByRole("columnheader", { name: "Player" });

    await user.click(screen.getByRole("checkbox", { name: /show money/i }));

    expect(window.localStorage.getItem("mulberry.leaderboards.show-money")).toBe(
      "true",
    );
  });

  it("uses competition ranking by points regardless of table sort", async () => {
    const user = userEvent.setup();
    renderLeaderboards();

    const playerTable = (await screen.findByRole("columnheader", {
      name: "Player",
    })).closest("table")!;

    await user.click(
      within(playerTable).getByRole("button", { name: "Player" }),
    );

    const rows = within(playerTable).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);

    const getRankForName = (name: string) => {
      const row = rows.find((r) =>
        within(r).queryByText(name, { selector: "td" }),
      );
      expect(row).toBeTruthy();
      const cells = within(row!).getAllByRole("cell");
      return cells[0]!.textContent;
    };

    expect(getRankForName("Alpha")).toBe("1");
    expect(getRankForName("Bravo")).toBe("2");
    expect(getRankForName("Charlie")).toBe("2");
    expect(getRankForName("Delta")).toBe("4");
  });

  it("ranks families by points with competition ties", async () => {
    renderLeaderboards();

    const familyHeader = await screen.findByRole("columnheader", {
      name: "Family",
    });
    const familyTable = familyHeader.closest("table")!;

    const rows = within(familyTable).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);

    const rankByFamily = (familyName: string) => {
      const row = rows.find((r) =>
        within(r).queryByText(familyName, { selector: "td" }),
      );
      expect(row).toBeTruthy();
      const cells = within(row!).getAllByRole("cell");
      return cells[0]!.textContent;
    };

    expect(rankByFamily("Family Top")).toBe("1");
    expect(rankByFamily("Family Tie A")).toBe("2");
    expect(rankByFamily("Family Tie B")).toBe("2");
    expect(rankByFamily("Family Low")).toBe("4");
  });

  it("passes applyMinRoundsFilter when viewing the active basketball season", async () => {
    fetchBasketballSeasonsMock.mockResolvedValue({
      seasons: [
        {
          id: 1,
          seasonNumber: 1,
          displayName: "Season 1",
          startsAt: "2024-01-01",
          endsAt: "2024-06-20",
          isActive: false,
          schemaVersion: 1,
        },
        {
          id: 2,
          seasonNumber: 2,
          displayName: "Season 2",
          startsAt: "2024-06-21",
          endsAt: "2024-12-20",
          isActive: true,
          schemaVersion: 1,
        },
      ],
      activeSeasonId: 2,
    });

    renderLeaderboards("/leaderboards/basketball");

    await screen.findByRole("columnheader", { name: "Player" });

    await waitFor(() => {
      expect(fetchLeaderboardsMock).toHaveBeenCalledWith(
        "basketball",
        expect.objectContaining({
          basketballSeasonId: 2,
          applyMinRoundsFilter: true,
        }),
      );
    });
  });

  it("does not pass applyMinRoundsFilter when viewing a past basketball season", async () => {
    fetchBasketballSeasonsMock.mockResolvedValue({
      seasons: [
        {
          id: 1,
          seasonNumber: 1,
          displayName: "Season 1",
          startsAt: "2024-01-01",
          endsAt: "2024-06-20",
          isActive: false,
          schemaVersion: 1,
        },
        {
          id: 2,
          seasonNumber: 2,
          displayName: "Season 2",
          startsAt: "2024-06-21",
          endsAt: "2024-12-20",
          isActive: true,
          schemaVersion: 1,
        },
      ],
      activeSeasonId: 2,
    });

    const user = userEvent.setup();
    renderLeaderboards("/leaderboards/basketball");

    await screen.findByRole("columnheader", { name: "Player" });

    // Wait for initial active-season fetch.
    await waitFor(() => {
      expect(fetchLeaderboardsMock).toHaveBeenCalledWith(
        "basketball",
        expect.objectContaining({ applyMinRoundsFilter: true }),
      );
    });

    // Switch to season 1 (past).
    await user.selectOptions(
      screen.getByRole("combobox", { name: /season/i }),
      "1",
    );

    await waitFor(() => {
      const calls = fetchLeaderboardsMock.mock.calls;
      const lastCall = calls[calls.length - 1]!;
      const opts = lastCall[1] as { applyMinRoundsFilter?: boolean } | undefined;
      expect(opts?.applyMinRoundsFilter).toBe(false);
    });
  });
});
