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

    expect(screen.getByText("Preset 2")).toBeInTheDocument();
    expect(screen.getByText("Team A 51% predicted win")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
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
