import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddPlayersDrawer } from "./AddPlayersDrawer";

const players = [
  { id: 3, displayName: "Charlie", roundsPlayed: 1 },
  { id: 1, displayName: "Alpha", roundsPlayed: 3 },
  { id: 2, displayName: "Bravo", roundsPlayed: 3 },
];

describe("AddPlayersDrawer", () => {
  it("defaults to rounds sort with player id tiebreaker", () => {
    render(
      <AddPlayersDrawer
        players={players}
        selectedIds={[]}
        onSelectionChange={() => undefined}
        sortMode="rounds-desc"
        onSortChange={() => undefined}
        onAddSelected={() => undefined}
        onDone={() => undefined}
      />,
    );

    const pills = screen.getAllByRole("button", { name: /^(Alpha|Bravo|Charlie)$/ });
    expect(pills.map((pill) => pill.textContent?.replace("✓", "").trim())).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(screen.getByRole("button", { name: "rnds" })).toHaveClass("pill");
  });

  it("filters players by search and sorts by name ascending", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <AddPlayersDrawer
        players={players}
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        sortMode="name-asc"
        onSortChange={() => undefined}
        onAddSelected={() => undefined}
        onDone={() => undefined}
      />,
    );

    const pills = screen.getAllByRole("button", { name: /^(Alpha|Bravo|Charlie)$/ });
    expect(pills.map((pill) => pill.textContent?.replace("✓", "").trim())).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);

    await user.type(screen.getByRole("searchbox"), "br");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Alpha" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Bravo" })).toBeInTheDocument();
  });

  it("toggles player selection through pills", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <AddPlayersDrawer
        players={players}
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        sortMode="rounds-desc"
        onSortChange={() => undefined}
        onAddSelected={() => undefined}
        onDone={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onSelectionChange).toHaveBeenCalledWith([1]);
  });
});
