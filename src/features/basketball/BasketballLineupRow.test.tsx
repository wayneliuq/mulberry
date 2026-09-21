import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BasketballLineupRow } from "./BasketballLineupRow";
import type { BasketballTeamPreset } from "../../lib/api/types";

const LINEUPS: BasketballTeamPreset[] = [
  {
    id: "preset-1",
    labelNumber: 1,
    teamAPlayerIds: [1, 2],
    teamBPlayerIds: [3, 4],
    teamAWinProb: 0.52,
    createdAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "preset-2",
    labelNumber: 2,
    teamAPlayerIds: [1, 3],
    teamBPlayerIds: [2, 4],
    teams: [[1, 3], [2, 4], [5, 6], [7, 8]],
    teamAWinProb: null,
    createdAt: "2026-06-25T01:00:00.000Z",
  },
  {
    id: "preset-3",
    labelNumber: 3,
    teamAPlayerIds: [1, 4],
    teamBPlayerIds: [2, 3],
    teamAWinProb: 0.48,
    createdAt: "2026-06-25T02:00:00.000Z",
  },
];

function lineupGroup() {
  return screen.getByRole("group", { name: "Apply a picked lineup" });
}

describe("BasketballLineupRow", () => {
  it("labels lineups A, B, C in pick order regardless of API ordering", () => {
    render(
      <BasketballLineupRow
        // Newest first, the way the API returns them.
        lineups={[...LINEUPS].reverse()}
        selectedPresetId={null}
        onSelectLineup={() => undefined}
      />,
    );

    expect(
      within(lineupGroup())
        .getAllByRole("button")
        .map((button) => button.querySelector(".pill-name")?.textContent),
    ).toEqual(["A", "B", "C"]);
  });

  it("shows each lineup's team count", () => {
    render(
      <BasketballLineupRow
        lineups={LINEUPS}
        selectedPresetId={null}
        onSelectLineup={() => undefined}
      />,
    );

    expect(
      within(lineupGroup())
        .getAllByRole("button")
        .map((button) => button.querySelector(".pill-meta")?.textContent),
    ).toEqual(["2 teams", "4 teams", "2 teams"]);
  });

  it("applies the lineup behind the chosen letter, not the newest one", async () => {
    const user = userEvent.setup();
    const onSelectLineup = vi.fn();

    render(
      <BasketballLineupRow
        lineups={LINEUPS}
        selectedPresetId={null}
        onSelectLineup={onSelectLineup}
      />,
    );

    await user.click(within(lineupGroup()).getByRole("button", { name: /^B/ }));
    expect(onSelectLineup).toHaveBeenCalledWith(LINEUPS[1]);
  });

  it("deselects when the active lineup is tapped again", async () => {
    const user = userEvent.setup();
    const onSelectLineup = vi.fn();

    render(
      <BasketballLineupRow
        lineups={LINEUPS}
        selectedPresetId="preset-1"
        onSelectLineup={onSelectLineup}
      />,
    );

    await user.click(within(lineupGroup()).getByRole("button", { name: /^A/ }));
    expect(onSelectLineup).toHaveBeenCalledWith(null);
  });

  it("keeps a lineup's letter once later lineups exist", async () => {
    const user = userEvent.setup();
    const onSelectLineup = vi.fn();

    const { rerender } = render(
      <BasketballLineupRow
        lineups={[LINEUPS[0]!]}
        selectedPresetId={null}
        onSelectLineup={onSelectLineup}
      />,
    );
    await user.click(within(lineupGroup()).getByRole("button", { name: /^A/ }));
    expect(onSelectLineup).toHaveBeenLastCalledWith(LINEUPS[0]);

    rerender(
      <BasketballLineupRow
        lineups={LINEUPS}
        selectedPresetId={null}
        onSelectLineup={onSelectLineup}
      />,
    );
    await user.click(within(lineupGroup()).getByRole("button", { name: /^A/ }));
    expect(onSelectLineup).toHaveBeenLastCalledWith(LINEUPS[0]);
  });

  it("offers no recency shortcut — every pill is a lineup letter", () => {
    render(
      <BasketballLineupRow
        lineups={LINEUPS}
        selectedPresetId={null}
        onSelectLineup={() => undefined}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /last/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Saved lineups")).not.toBeInTheDocument();
    expect(screen.getByText("Lineups")).toBeInTheDocument();
  });

  it("shows loading and empty states", () => {
    const { rerender } = render(
      <BasketballLineupRow
        lineups={[]}
        selectedPresetId={null}
        onSelectLineup={() => undefined}
        isLoading
        loadingMessage="Loading lineups…"
      />,
    );
    expect(screen.getByText("Loading lineups…")).toBeInTheDocument();

    rerender(
      <BasketballLineupRow
        lineups={[]}
        selectedPresetId={null}
        onSelectLineup={() => undefined}
        emptyMessage="No lineups picked yet"
      />,
    );
    expect(screen.getByText("No lineups picked yet")).toBeInTheDocument();
  });
});
