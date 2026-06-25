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
});
