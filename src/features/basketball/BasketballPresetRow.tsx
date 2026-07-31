import type { BasketballTeamPreset } from "../../lib/api/types";
import {
  OptionPillGroup,
  type OptionPillGroupOption,
} from "../ui/OptionPillGroup";

type BasketballPresetRowProps = {
  presets: BasketballTeamPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: BasketballTeamPreset | null) => void;
  hasLastRound?: boolean;
  onSelectLastRound?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  ariaLabel?: string;
};

export function BasketballPresetRow({
  presets,
  selectedPresetId,
  onSelectPreset,
  hasLastRound = false,
  onSelectLastRound,
  disabled = false,
  isLoading = false,
  loadingMessage = "Loading saved lineups…",
  emptyMessage = "No saved lineups yet",
  ariaLabel = "Apply a saved lineup",
}: BasketballPresetRowProps) {
  if (isLoading) {
    return <p className="muted">{loadingMessage}</p>;
  }

  if (presets.length === 0 && !hasLastRound) {
    return <p className="muted">{emptyMessage}</p>;
  }

  const options: OptionPillGroupOption<string>[] = presets.map(
    (preset): OptionPillGroupOption<string> => ({
      value: preset.id,
      label: String(preset.labelNumber),
    }),
  );

  if (hasLastRound) {
    options.unshift({
      value: "last",
      label: "Last",
    });
  }

  const presetById = new Map(presets.map((preset) => [preset.id, preset]));

  return (
    <div className="stack-xs">
      <span className="muted">Saved lineups</span>
      <OptionPillGroup
        options={options}
        value={selectedPresetId}
        onChange={(presetId) => {
          if (presetId === null) {
            onSelectPreset(null);
            return;
          }
          if (presetId === "last") {
            onSelectLastRound?.();
            return;
          }
          const preset = presetById.get(presetId);
          onSelectPreset(preset ?? null);
        }}
        disabled={disabled}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
