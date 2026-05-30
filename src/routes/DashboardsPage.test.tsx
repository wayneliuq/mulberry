import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchBasketballDashboardData,
  fetchBasketballSeasons,
} from "../lib/api/read";
import {
  NBA_COMP_ANCHOR_STORAGE_KEY,
  NBA_COMPARISON_SECTION_TITLE,
} from "../features/dashboards/basketball/constants";
import { AdminSessionProvider } from "../features/admin/AdminSessionContext";
import { copy } from "../features/ui/copy";
import { DashboardsPage } from "./DashboardsPage";

vi.mock("../lib/api/read", () => ({
  fetchBasketballDashboardData: vi.fn(),
  fetchBasketballSeasons: vi.fn(),
}));

const fetchBasketballDashboardDataMock = vi.mocked(fetchBasketballDashboardData);
const fetchBasketballSeasonsMock = vi.mocked(fetchBasketballSeasons);

const mockSeasonsPayload = {
  seasons: [
    {
      id: 1,
      seasonNumber: 1,
      displayName: "Season 1",
      startsAt: "1970-01-01T00:00:00.000Z",
      endsAt: "2026-06-21T07:00:00.000Z",
      isActive: true,
      schemaVersion: 1,
    },
  ],
  activeSeasonId: 1,
};

function renderDashboardsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <MemoryRouter>
          <DashboardsPage />
        </MemoryRouter>
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}

describe("DashboardsPage", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(NBA_COMP_ANCHOR_STORAGE_KEY);
    }
    fetchBasketballSeasonsMock.mockResolvedValue(mockSeasonsPayload);
  });

  it("renders basketball sections and jump chips", async () => {
    fetchBasketballDashboardDataMock.mockResolvedValue({
      seasonId: 1,
      players: [
        { id: 1, displayName: "A", familyId: "f1" },
        { id: 2, displayName: "B", familyId: "f2" },
        { id: 3, displayName: "C", familyId: "f3" },
        { id: 4, displayName: "D", familyId: "f4" },
      ],
      rounds: Array.from({ length: 24 }).map((_, idx) => ({
        roundId: `r-${idx + 1}`,
        gameId: "g-1",
        roundNumber: idx + 1,
        createdAt: `2026-02-${String((idx % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
        teamAPlayerIds: [1, 2],
        teamBPlayerIds: [3, 4],
        scoreTeamA: idx % 2 === 0 ? 11 : 8,
        scoreTeamB: idx % 2 === 0 ? 8 : 11,
      })),
      roundEntries: Array.from({ length: 24 }).flatMap((_, idx) => {
        const roundId = `r-${idx + 1}`;
        const aWon = idx % 2 === 0;
        return [
          { roundId, playerId: 1, pointDelta: aWon ? 1 : -1 },
          { roundId, playerId: 2, pointDelta: aWon ? 1 : -1 },
          { roundId, playerId: 3, pointDelta: aWon ? -1 : 1 },
          { roundId, playerId: 4, pointDelta: aWon ? -1 : 1 },
        ];
      }),
    });

    renderDashboardsPage();

    expect(
      await screen.findByRole("heading", { name: NBA_COMPARISON_SECTION_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Player" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Pro match" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Fit" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Best / Worst Combos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.dashboards.back })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pro match" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Upset Machine" })).toBeInTheDocument();
    expect(screen.getByText(/New season starts on/i)).toBeInTheDocument();
  });

  it("shows an error state when data fetch fails", async () => {
    fetchBasketballDashboardDataMock.mockRejectedValue(new Error("dashboard failed"));

    renderDashboardsPage();

    expect(await screen.findByText("dashboard failed")).toBeInTheDocument();
  });
});
