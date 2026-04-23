import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { fetchLeaderboards } from "../lib/api/read";
import type { LeaderboardData } from "../lib/api/types";
import { LeaderboardsPage } from "./LeaderboardsPage";

vi.mock("../lib/api/read", () => ({
  fetchLeaderboards: vi.fn(),
}));

const fetchLeaderboardsMock = vi.mocked(fetchLeaderboards);

function renderLeaderboards() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeaderboardsPage />
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
    fetchLeaderboardsMock.mockResolvedValue({
      players: samplePlayers,
      families: sampleFamilies,
    });
  });

  it("hides $ column by default and shows it when Show $ is toggled", async () => {
    const user = userEvent.setup();
    renderLeaderboards();

    await screen.findByRole("columnheader", { name: "Player" });

    expect(
      screen.queryByRole("columnheader", { name: "$" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /show \$/i }));

    expect(
      screen.getAllByRole("columnheader", { name: "$" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("persists Show $ from localStorage on mount", async () => {
    window.localStorage.setItem("mulberry.leaderboards.show-money", "true");
    renderLeaderboards();

    await screen.findByRole("columnheader", { name: "$" });

    expect(screen.getByRole("checkbox", { name: /show \$/i })).toBeChecked();
  });

  it("writes Show $ preference to localStorage when toggled", async () => {
    const user = userEvent.setup();
    renderLeaderboards();

    await screen.findByRole("columnheader", { name: "Player" });

    await user.click(screen.getByRole("checkbox", { name: /show \$/i }));

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
});
