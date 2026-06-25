import type { BasketballTeamPreset } from "../../lib/api/types";

type PlayerName = {
  playerId: number;
  displayName: string;
};

type BasketballPickedTeamsPanelProps = {
  preset: BasketballTeamPreset | null;
  playersById: Map<number, string>;
  isLoading?: boolean;
  loadingMessage?: string;
};

function teamColumn(
  label: string,
  playerIds: number[],
  playersById: Map<number, string>,
) {
  return (
    <div className="stack-sm basketball-picked-teams-column">
      <strong className="basketball-picked-teams-heading">{label}</strong>
      {playerIds.length === 0 ? (
        <p className="muted basketball-picked-teams-empty">No players</p>
      ) : (
        <ul className="list-reset stack-xs">
          {playerIds.map((playerId) => (
            <li key={playerId} className="list-item basketball-picked-teams-player">
              <span>{playersById.get(playerId) ?? playerId}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

  const winPct =
    preset.teamAWinProb === null
      ? null
      : Math.round(preset.teamAWinProb * 100);

  return (
    <div id="basketball-pick-teams-panel" className="card-subsection stack-sm">
      <div className="stack-xs">
        <strong>Preset {preset.labelNumber}</strong>
        {winPct !== null ? (
          <p className="muted">Team A {winPct}% predicted win</p>
        ) : null}
      </div>
      <div className="player-list-two-col basketball-picked-teams-grid">
        {teamColumn("Team A", preset.teamAPlayerIds, playersById)}
        {teamColumn("Team B", preset.teamBPlayerIds, playersById)}
      </div>
    </div>
  );
}
