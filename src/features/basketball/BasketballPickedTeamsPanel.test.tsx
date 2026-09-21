import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BasketballPickedTeamsPanel } from "./BasketballPickedTeamsPanel";

describe("BasketballPickedTeamsPanel", () => {
  it("renders team columns for a preset", () => {
    render(
      <BasketballPickedTeamsPanel
        preset={{
          id: "preset-1",
          labelNumber: 2,
          teamAPlayerIds: [1, 2],
          teamBPlayerIds: [3],
          teamAWinProb: 0.51,
          createdAt: "2026-06-25T00:00:00.000Z",
        }}
        playersById={
          new Map([
            [1, "Alpha"],
            [2, "Bravo"],
            [3, "Charlie"],
          ])
        }
      />,
    );

    expect(screen.getByText("Lineup B")).toBeInTheDocument();
    expect(screen.getByText("Team A 51% predicted win")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("renders a column per team for a multi-team preset", () => {
    render(
      <BasketballPickedTeamsPanel
        preset={{
          id: "preset-9",
          labelNumber: 9,
          teamAPlayerIds: [1, 2],
          teamBPlayerIds: [3, 4],
          teams: [
            [1, 2],
            [3, 4],
            [5, 6],
            [7, 8],
          ],
          teamAWinProb: 0.5,
          createdAt: "2026-06-25T00:00:00.000Z",
        }}
        playersById={
          new Map([
            [1, "Alpha"],
            [2, "Bravo"],
            [3, "Charlie"],
            [4, "Delta"],
            [5, "Echo"],
            [6, "Foxtrot"],
            [7, "Golf"],
            [8, "Hotel"],
          ])
        }
      />,
    );

    expect(screen.getByText("Lineup I")).toBeInTheDocument();
    for (const label of ["Team A", "Team B", "Team C", "Team D"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Team E")).not.toBeInTheDocument();
    expect(screen.getByText("Hotel")).toBeInTheDocument();
    // Win probability is a two-sided number; it is meaningless across 4 teams.
    expect(screen.queryByText(/predicted win/)).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <BasketballPickedTeamsPanel
        preset={null}
        playersById={new Map()}
        isLoading
        loadingMessage="Loading season ratings…"
      />,
    );

    expect(screen.getByText("Loading season ratings…")).toBeInTheDocument();
  });
});
