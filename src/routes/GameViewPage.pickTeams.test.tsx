import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSessionProvider } from "../features/admin/AdminSessionContext";
import { copy } from "../features/ui/copy";
import { adminWrite, verifyAdminPassword } from "../lib/api/admin";
import {
  fetchBasketballRoundHistory,
  fetchBasketballSeasons,
  fetchGameDetails,
  fetchPlayerRoundCountsByGameType,
  fetchPlayers,
  syncBasketballSeasonActive,
} from "../lib/api/read";
import type { GameDetails } from "../lib/api/types";
import { GameViewPage } from "./GameViewPage";

vi.mock("../lib/api/read", () => ({
  fetchBasketballRoundHistory: vi.fn(),
  fetchBasketballSeasons: vi.fn(),
  fetchGameDetails: vi.fn(),
  fetchPlayerRoundCountsByGameType: vi.fn(),
  fetchPlayers: vi.fn(),
  syncBasketballSeasonActive: vi.fn(),
}));

vi.mock("../lib/api/admin", () => ({
  adminWrite: vi.fn(),
  verifyAdminPassword: vi.fn(),
}));

const fetchGameDetailsMock = vi.mocked(fetchGameDetails);
const fetchPlayersMock = vi.mocked(fetchPlayers);
const fetchBasketballSeasonsMock = vi.mocked(fetchBasketballSeasons);
const fetchBasketballRoundHistoryMock = vi.mocked(fetchBasketballRoundHistory);
const fetchPlayerRoundCountsMock = vi.mocked(fetchPlayerRoundCountsByGameType);
const syncBasketballSeasonActiveMock = vi.mocked(syncBasketballSeasonActive);
const adminWriteMock = vi.mocked(adminWrite);
const verifyAdminPasswordMock = vi.mocked(verifyAdminPassword);

const PLAYER_COUNT = 8;

function makeGame(): GameDetails {
  return {
    id: "game-1",
    displayName: "Sunday run",
    gameTypeId: "basketball",
    status: "open",
    pointBasis: 1,
    moneyPerPointCents: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    endedAt: null,
    players: Array.from({ length: PLAYER_COUNT }, (_, index) => ({
      gamePlayerId: `gp-${index + 1}`,
      playerId: index + 1,
      displayName: `Player ${index + 1}`,
      familyId: null,
      joinOrder: index + 1,
      isLocked: false,
      isScoreNeutralHidden: false,
      total: 0,
    })),
    rounds: [],
    settlement: null,
    basketballTeamPresets: [],
  };
}

function renderGameViewPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <MemoryRouter initialEntries={["/games/game-1"]}>
          <Routes>
            <Route path="/games/:gameId" element={<GameViewPage />} />
          </Routes>
        </MemoryRouter>
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}

/** The `save_basketball_team_preset` body the page sent to `adminWrite`. */
function savedPresetPayload(): { action: string; teams: number[][] } {
  const [payload] = adminWriteMock.mock.calls[0] ?? [];
  return payload as unknown as { action: string; teams: number[][] };
}

async function openPickTeamsDialog() {
  const user = userEvent.setup();
  renderGameViewPage();

  const pickTeams = await screen.findByRole("button", {
    name: copy.gameView.pickTeams,
  });
  await waitFor(() => expect(pickTeams).toBeEnabled());
  await user.click(pickTeams);

  return { user, dialog: await screen.findByRole("dialog") };
}

describe("GameViewPage — pick teams", () => {
  beforeEach(() => {
    window.localStorage.setItem("mulberry.admin-password", "test-password");
    verifyAdminPasswordMock.mockResolvedValue(undefined);
    fetchGameDetailsMock.mockResolvedValue(makeGame());
    fetchPlayersMock.mockResolvedValue(
      Array.from({ length: PLAYER_COUNT }, (_, index) => ({
        id: index + 1,
        displayName: `Player ${index + 1}`,
        familyId: null,
        isScoreNeutralHidden: false,
      })),
    );
    fetchBasketballSeasonsMock.mockResolvedValue({
      seasons: [
        {
          id: 2,
          seasonNumber: 2,
          displayName: "Season 2",
          startsAt: "2026-06-21T07:00:00.000Z",
          endsAt: "2026-12-21T08:00:00.000Z",
          isActive: true,
          schemaVersion: 1,
        },
      ],
      activeSeasonId: 2,
    });
    fetchBasketballRoundHistoryMock.mockResolvedValue([]);
    fetchPlayerRoundCountsMock.mockResolvedValue(new Map());
    syncBasketballSeasonActiveMock.mockResolvedValue(2);
    adminWriteMock.mockReset();
    adminWriteMock.mockResolvedValue({ preset: null });
  });

  it("has no team-count pills on the page itself", async () => {
    renderGameViewPage();

    await screen.findByRole("button", { name: copy.gameView.pickTeams });
    expect(
      screen.queryByRole("group", {
        name: copy.gameView.basketballTeamCountLabel,
      }),
    ).not.toBeInTheDocument();
  });

  it("opens a dialog offering 2–6 teams, defaulted to 2", async () => {
    const { dialog } = await openPickTeamsDialog();

    const counts = within(dialog).getByRole("group", {
      name: copy.gameView.basketballTeamCountLabel,
    });
    expect(
      within(counts)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["2", "3", "4", "5", "6"]);
    expect(
      within(counts).getByRole("button", { name: "2" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("picks 4v4 from eight players when confirmed at the default count", async () => {
    const { user, dialog } = await openPickTeamsDialog();

    await user.click(
      within(dialog).getByRole("button", {
        name: copy.gameView.pickTeamsConfirm,
      }),
    );

    await waitFor(() => expect(adminWriteMock).toHaveBeenCalled());
    const payload = savedPresetPayload();
    expect(payload.action).toBe("save_basketball_team_preset");
    expect(payload.teams.map((team) => team.length)).toEqual([4, 4]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("picks with the count chosen in the dialog", async () => {
    const { user, dialog } = await openPickTeamsDialog();

    await user.click(within(dialog).getByRole("button", { name: "4" }));
    await user.click(
      within(dialog).getByRole("button", {
        name: copy.gameView.pickTeamsConfirm,
      }),
    );

    await waitFor(() => expect(adminWriteMock).toHaveBeenCalled());
    const payload = savedPresetPayload();
    expect(payload.teams.map((team) => team.length)).toEqual([2, 2, 2, 2]);
  });

  it("picks nothing when the dialog is cancelled", async () => {
    const { user, dialog } = await openPickTeamsDialog();

    await user.click(
      within(dialog).getByRole("button", { name: copy.common.cancel }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(adminWriteMock).not.toHaveBeenCalled();
  });

  it("starts from 2 teams again the next time the dialog opens", async () => {
    const { user, dialog } = await openPickTeamsDialog();

    await user.click(within(dialog).getByRole("button", { name: "5" }));
    await user.click(
      within(dialog).getByRole("button", { name: copy.common.cancel }),
    );

    await user.click(
      screen.getByRole("button", { name: copy.gameView.pickTeams }),
    );
    const reopened = await screen.findByRole("dialog");
    expect(
      within(reopened).getByRole("button", { name: "2" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
