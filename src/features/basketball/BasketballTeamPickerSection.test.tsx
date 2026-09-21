import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BasketballTeamPickerSection } from "./BasketballTeamPickerSection";

describe("BasketballTeamPickerSection", () => {
  it("assigns teams with mutually exclusive pill buttons", async () => {
    const user = userEvent.setup();
    const onTeamChange = vi.fn();

    render(
      <BasketballTeamPickerSection
        players={[
          { playerId: 1, displayName: "Alpha" },
          { playerId: 2, displayName: "Bravo" },
        ]}
        teamByPlayerId={{}}
        onTeamChange={onTeamChange}
        sortMode="name-asc"
        onSortChange={() => undefined}
      />,
    );

    const alphaGroup = screen.getByRole("group", {
      name: "Team assignment for Alpha",
    });
    await user.click(within(alphaGroup).getByRole("button", { name: "Team A" }));
    expect(onTeamChange).toHaveBeenCalledWith(1, "A");
  });

  it("offers only Team A and Team B by default", () => {
    render(
      <BasketballTeamPickerSection
        players={[{ playerId: 1, displayName: "Alpha" }]}
        teamByPlayerId={{}}
        onTeamChange={() => undefined}
        sortMode="name-asc"
        onSortChange={() => undefined}
      />,
    );

    const group = screen.getByRole("group", {
      name: "Team assignment for Alpha",
    });
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Team A", "Team B"]);
  });

  it.each([
    { numTeams: 3, labels: ["Team A", "Team B", "Team C"] },
    { numTeams: 4, labels: ["Team A", "Team B", "Team C", "Team D"] },
    {
      numTeams: 6,
      labels: [
        "Team A",
        "Team B",
        "Team C",
        "Team D",
        "Team E",
        "Team F",
      ],
    },
  ])("offers $numTeams team pills", ({ numTeams, labels }) => {
    render(
      <BasketballTeamPickerSection
        players={[{ playerId: 1, displayName: "Alpha" }]}
        teamByPlayerId={{}}
        onTeamChange={() => undefined}
        sortMode="name-asc"
        onSortChange={() => undefined}
        numTeams={numTeams}
      />,
    );

    const group = screen.getByRole("group", {
      name: "Team assignment for Alpha",
    });
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(labels);
  });

  it("assigns a player to a team beyond B when more teams are in play", async () => {
    const user = userEvent.setup();
    const onTeamChange = vi.fn();

    render(
      <BasketballTeamPickerSection
        players={[{ playerId: 7, displayName: "Alpha" }]}
        teamByPlayerId={{}}
        onTeamChange={onTeamChange}
        sortMode="name-asc"
        onSortChange={() => undefined}
        numTeams={4}
      />,
    );

    const group = screen.getByRole("group", {
      name: "Team assignment for Alpha",
    });
    await user.click(within(group).getByRole("button", { name: "Team D" }));
    expect(onTeamChange).toHaveBeenCalledWith(7, "D");
  });

  it("shows no selection for a player stranded on a team outside the count", () => {
    render(
      <BasketballTeamPickerSection
        players={[{ playerId: 1, displayName: "Alpha" }]}
        teamByPlayerId={{ 1: "E" }}
        onTeamChange={() => undefined}
        sortMode="name-asc"
        onSortChange={() => undefined}
        numTeams={2}
      />,
    );

    const group = screen.getByRole("group", {
      name: "Team assignment for Alpha",
    });
    for (const button of within(group).getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });
});
