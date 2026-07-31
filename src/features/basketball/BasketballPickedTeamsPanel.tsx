import type { BasketballTeamPreset } from "../../lib/api/types";

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
    preset.teams && preset.teams.length > 2
      ? preset.teams.map((playerIds, idx) => ({
          label: `Team ${String.fromCharCode(65 + idx)}`,
          playerIds,
        }))
      : [
          { label: "Team A", playerIds: preset.teamAPlayerIds },
          { label: "Team B", playerIds: preset.teamBPlayerIds },
        ];

  const winPct =
    preset.teamAWinProb === null
      ? null
      : Math.round(preset.teamAWinProb * 100);

  return (
    <div id="basketball-pick-teams-panel" className="card-subsection stack-sm">
      <div className="stack-xs">
        <strong>Preset {preset.labelNumber}</strong>
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
