import type { BasketballTeamPreset } from "../../lib/api/types";
import { basketballLineupId } from "./basketballLineups";
import {
  ALL_BASKETBALL_TEAM_LETTERS,
  basketballPresetPartitions,
} from "./basketballTeams";

type BasketballPickedTeamsPanelProps = {
  preset: BasketballTeamPreset | null;
  playersById: Map<number, string>;
  isLoading?: boolean;
  loadingMessage?: string;
};

export function BasketballPickedTeamsPanel({
  preset,
  playersById,
  isLoading = false,
  loadingMessage = "Loading season ratings…",
}: BasketballPickedTeamsPanelProps) {
  if (isLoading) {
    return (
      <div
        id="basketball-pick-teams-panel"
        className="card-subsection stack-sm"
        aria-busy="true"
      >
        <p className="muted">{loadingMessage}</p>
      </div>
    );
  }

  if (!preset) {
    return null;
  }

  const teamsList: { label: string; playerIds: number[] }[] =
    basketballPresetPartitions(preset).map((playerIds, index) => ({
      label: `Team ${ALL_BASKETBALL_TEAM_LETTERS[index] ?? index + 1}`,
      playerIds,
    }));

  const winPct =
    preset.teamAWinProb === null
      ? null
      : Math.round(preset.teamAWinProb * 100);

  return (
    <div id="basketball-pick-teams-panel" className="card-subsection stack-sm">
      <div className="stack-xs">
        <strong>Lineup {basketballLineupId(preset.labelNumber)}</strong>
        {winPct !== null && teamsList.length === 2 ? (
          <p className="muted">Team A {winPct}% predicted win</p>
        ) : null}
      </div>
      <div className="player-list-two-col basketball-picked-teams-grid">
        {teamsList.map((t) => (
          <div key={t.label} className="stack-sm basketball-picked-teams-column">
            <strong className="basketball-picked-teams-heading">{t.label}</strong>
            {t.playerIds.length === 0 ? (
              <p className="muted basketball-picked-teams-empty">No players</p>
            ) : (
              <ul className="list-reset stack-xs">
                {t.playerIds.map((playerId) => (
                  <li
                    key={playerId}
                    className="list-item basketball-picked-teams-player"
                  >
                    <span>{playersById.get(playerId) ?? playerId}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
