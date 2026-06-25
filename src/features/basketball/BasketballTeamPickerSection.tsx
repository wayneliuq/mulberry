import {
  OptionPillGroup,
  type OptionPillGroupOption,
} from "../ui/OptionPillGroup";
import {
  PlayerSortButtons,
  type PlayerLike,
  type PlayerSortMode,
} from "../players/SortablePlayerList";

export type BasketballTeamChoice = "none" | "A" | "B";

export const BASKETBALL_TEAM_PILL_OPTIONS = [
  { value: "A", label: "Team A" },
  { value: "B", label: "Team B" },
] as const satisfies readonly OptionPillGroupOption<"A" | "B">[];

type BasketballTeamPickerSectionProps<T extends PlayerLike> = {
  players: T[];
  teamByPlayerId: Record<number, BasketballTeamChoice | undefined>;
  onTeamChange: (playerId: number, team: BasketballTeamChoice) => void;
  sortMode: PlayerSortMode;
  onSortChange: (mode: PlayerSortMode) => void;
};

function pillValueForTeam(
  team: BasketballTeamChoice | undefined,
): "A" | "B" | null {
  return team === "A" || team === "B" ? team : null;
}

export function BasketballTeamPickerSection<T extends PlayerLike>({
  players,
  teamByPlayerId,
  onTeamChange,
  sortMode,
  onSortChange,
}: BasketballTeamPickerSectionProps<T>) {
  return (
    <div className="stack-sm">
      <PlayerSortButtons sortMode={sortMode} onSortChange={onSortChange} />
      <div className="player-list-two-col">
        {players.map((player) => {
          const playerId = player.playerId ?? player.id;
          if (playerId == null) {
            return null;
          }

          return (
            <div key={playerId} className="stack-xs basketball-team-picker-row">
              <span>{player.displayName}</span>
              <OptionPillGroup
                options={BASKETBALL_TEAM_PILL_OPTIONS}
                value={pillValueForTeam(teamByPlayerId[playerId])}
                onChange={(team) =>
                  onTeamChange(playerId, team ?? "none")
                }
                ariaLabel={`Team assignment for ${player.displayName}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
