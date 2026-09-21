import type { BasketballTeamPreset } from "../../lib/api/types";
import {
  OptionPillGroup,
  type OptionPillGroupOption,
} from "../ui/OptionPillGroup";
import { basketballLineups } from "./basketballLineups";

type BasketballLineupRowProps = {
  lineups: BasketballTeamPreset[];
  selectedPresetId: string | null;
  onSelectLineup: (preset: BasketballTeamPreset | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  ariaLabel?: string;
};

function pickedAtLabel(createdAt: string): string | null {
  const picked = new Date(createdAt);
  if (Number.isNaN(picked.getTime())) {
    return null;
  }
  return picked.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The game's picked lineups, addressed by letter. Every "Pick teams" run adds a
 * lineup, so the row only grows: choosing "C" always re-applies the third
 * lineup of this game no matter how many have been picked since, and no matter
 * how many teams it was split into.
 */
export function BasketballLineupRow({
  lineups,
  selectedPresetId,
  onSelectLineup,
  disabled = false,
  isLoading = false,
  loadingMessage = "Loading lineups…",
  emptyMessage = "No lineups picked yet",
  ariaLabel = "Apply a picked lineup",
}: BasketballLineupRowProps) {
  if (isLoading) {
    return <p className="muted">{loadingMessage}</p>;
  }

  if (lineups.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  const entries = basketballLineups(lineups);

  const options: OptionPillGroupOption<string>[] = entries.map((entry) => {
    const pickedAt = pickedAtLabel(entry.preset.createdAt);
    return {
      value: entry.presetId,
      label: entry.lineupId,
      description: `${entry.teamCount} teams`,
      title: `Lineup ${entry.lineupId} · ${entry.teamCount} teams${
        pickedAt ? ` · picked ${pickedAt}` : ""
      }`,
    };
  });

  const presetById = new Map(
    entries.map((entry) => [entry.presetId, entry.preset]),
  );

  return (
    <div className="stack-xs">
      <span className="muted">Lineups</span>
      <OptionPillGroup
        options={options}
        value={selectedPresetId}
        onChange={(presetId) => {
          onSelectLineup(presetId === null ? null : presetById.get(presetId) ?? null);
        }}
        disabled={disabled}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
