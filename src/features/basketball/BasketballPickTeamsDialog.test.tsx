import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BasketballPickTeamsDialog } from "./BasketballPickTeamsDialog";
import { copy } from "../ui/copy";

function renderDialog(overrides?: {
  playerCount?: number;
  maxPlayers?: number;
}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <BasketballPickTeamsDialog
      playerCount={overrides?.playerCount ?? 8}
      maxPlayers={overrides?.maxPlayers ?? 12}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

function teamCountGroup() {
  return screen.getByRole("group", {
    name: copy.gameView.basketballTeamCountLabel,
  });
}

function teamCountButton(count: number) {
  return within(teamCountGroup()).getByRole("button", {
    name: String(count),
  });
}

describe("BasketballPickTeamsDialog", () => {
  it("offers 2 through 6 teams with 2 selected by default", () => {
    renderDialog();

    const options = within(teamCountGroup()).getAllByRole("button");
    expect(options.map((option) => option.textContent)).toEqual([
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(teamCountButton(2)).toHaveAttribute("aria-pressed", "true");
    for (const count of [3, 4, 5, 6]) {
      expect(teamCountButton(count)).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("confirms with the default count without touching the pills", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(
      screen.getByRole("button", { name: copy.gameView.pickTeamsConfirm }),
    );

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("confirms with the count the user selected", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(teamCountButton(4));
    expect(teamCountButton(4)).toHaveAttribute("aria-pressed", "true");
    expect(teamCountButton(2)).toHaveAttribute("aria-pressed", "false");

    await user.click(
      screen.getByRole("button", { name: copy.gameView.pickTeamsConfirm }),
    );

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(4);
  });

  it("previews the even split the balancer will produce", async () => {
    const user = userEvent.setup();
    renderDialog({ playerCount: 8 });

    expect(screen.getByText("Teams of 4 · 4")).toBeInTheDocument();

    await user.click(teamCountButton(3));
    expect(screen.getByText("Teams of 3 · 3 · 2")).toBeInTheDocument();
  });

  it("blocks confirm when the roster is smaller than the chosen count", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog({ playerCount: 3 });

    const confirm = screen.getByRole("button", {
      name: copy.gameView.pickTeamsConfirm,
    });
    expect(confirm).toBeEnabled();

    await user.click(teamCountButton(5));
    expect(
      screen.getByText(copy.gameView.pickTeamsNeedPlayers(5)),
    ).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("blocks confirm when the roster is too large to auto-balance", () => {
    renderDialog({ playerCount: 13, maxPlayers: 12 });

    expect(
      screen.getByText(copy.gameView.pickTeamsTooManyPlayers),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.gameView.pickTeamsConfirm }),
    ).toBeDisabled();
    // 13 players still has an arithmetic 7/6 split, but previewing a split the
    // balancer will refuse only contradicts the error above it.
    expect(
      screen.queryByText(copy.gameView.pickTeamsSizePreview([7, 6])),
    ).not.toBeInTheDocument();
  });

  it("cancels on the cancel button", async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: copy.common.cancel }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels on a backdrop click but not on a click inside the dialog", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(document.querySelector(".modal-backdrop")!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("is labelled as a modal dialog and takes focus", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(copy.gameView.pickTeams);
    expect(dialog).toHaveFocus();
  });
});
