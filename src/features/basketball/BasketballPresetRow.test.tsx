import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BasketballPresetRow } from "./BasketballPresetRow";

const PRESETS = [
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
    labelNumber: 3,
    teamAPlayerIds: [1, 3],
    teamBPlayerIds: [2, 4],
    teamAWinProb: 0.48,
    createdAt: "2026-06-25T01:00:00.000Z",
  },
];

describe("BasketballPresetRow", () => {
  it("selects a preset and deselects when the active pill is clicked again", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();

    const { rerender } = render(
      <BasketballPresetRow
        presets={PRESETS}
        selectedPresetId={null}
        onSelectPreset={onSelectPreset}
      />,
    );

    await user.click(screen.getByRole("button", { name: "1" }));
    expect(onSelectPreset).toHaveBeenCalledWith(PRESETS[0]);

    rerender(
      <BasketballPresetRow
        presets={PRESETS}
        selectedPresetId="preset-1"
        onSelectPreset={onSelectPreset}
      />,
    );

    await user.click(screen.getByRole("button", { name: /1/i }));
    expect(onSelectPreset).toHaveBeenLastCalledWith(null);
  });

  it("shows loading and empty states", () => {
    const { rerender } = render(
      <BasketballPresetRow
        presets={[]}
        selectedPresetId={null}
        onSelectPreset={() => undefined}
        isLoading
        loadingMessage="Loading saved lineups…"
      />,
    );
    expect(screen.getByText("Loading saved lineups…")).toBeInTheDocument();

    rerender(
      <BasketballPresetRow
        presets={[]}
        selectedPresetId={null}
        onSelectPreset={() => undefined}
        emptyMessage="No saved lineups yet"
      />,
    );
    expect(screen.getByText("No saved lineups yet")).toBeInTheDocument();
  });
});
