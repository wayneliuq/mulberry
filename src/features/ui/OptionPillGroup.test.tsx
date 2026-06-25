import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OptionPillGroup } from "./OptionPillGroup";

const TEAM_OPTIONS = [
  { value: "A", label: "Team A" },
  { value: "B", label: "Team B" },
] as const;

describe("OptionPillGroup", () => {
  it("selects one option and clears when the active pill is clicked again", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <OptionPillGroup
        options={TEAM_OPTIONS}
        value={null}
        onChange={onChange}
        ariaLabel="Team assignment"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Team A" }));
    expect(onChange).toHaveBeenCalledWith("A");

    rerender(
      <OptionPillGroup
        options={TEAM_OPTIONS}
        value="A"
        onChange={onChange}
        ariaLabel="Team assignment"
      />,
    );

    const teamAButton = screen.getByRole("button", { name: /Team A/i });
    expect(teamAButton).toHaveAttribute("aria-pressed", "true");

    await user.click(teamAButton);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("switches selection when another option is chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <OptionPillGroup
        options={TEAM_OPTIONS}
        value="A"
        onChange={onChange}
        ariaLabel="Team assignment"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Team B" }));
    expect(onChange).toHaveBeenCalledWith("B");
  });
});
