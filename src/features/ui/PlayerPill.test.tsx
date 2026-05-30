import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayerPill } from "./PlayerPill";

describe("PlayerPill", () => {
  it("renders full display name and toggles on click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <PlayerPill
        displayName="김철수"
        selected={false}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByRole("button", { name: "김철수" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "김철수" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows selected state with checkmark", () => {
    render(
      <PlayerPill
        displayName="Qiang Liu"
        selected
        onToggle={() => undefined}
      />,
    );

    const button = screen.getByRole("button", { name: /Qiang Liu/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("player-pill-selected");
    expect(button).toHaveTextContent("✓");
  });
});
