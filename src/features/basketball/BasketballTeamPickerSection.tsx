import {
  OptionPillGroup,
  type OptionPillGroupOption,
} from "../ui/OptionPillGroup";
import {
  PlayerSortButtons,
  type PlayerLike,
  type PlayerSortMode,
} from "../players/SortablePlayerList";
import {
  basketballTeamLetters,
  MIN_BASKETBALL_TEAM_COUNT,
  type BasketballTeamChoice,
} from "./basketballTeams";

export type { BasketballTeamChoice };

type BasketballTeamPickerSectionProps<T extends PlayerLike> = {
  players: T[];
  teamByPlayerId: Record<number, BasketballTeamChoice | undefined>;
  onTeamChange: (playerId: number, team: BasketballTeamChoice) => void;
  sortMode: PlayerSortMode;
  onSortChange: (mode: PlayerSortMode) => void;
  numTeams?: number;
};

function pillValueForTeam(
  team: BasketballTeamChoice | undefined,
  activeLetters: Set<BasketballTeamChoice>,
): BasketballTeamChoice | null {
  return team && activeLetters.has(team) ? team : null;
}

export function BasketballTeamPickerSection<T extends PlayerLike>({
  players,
  teamByPlayerId,
  onTeamChange,
  sortMode,
  onSortChange,
  numTeams = MIN_BASKETBALL_TEAM_COUNT,
}: BasketballTeamPickerSectionProps<T>) {
  const activeLetters = basketballTeamLetters(numTeams);
  const activeLetterSet = new Set<BasketballTeamChoice>(activeLetters);

  const pillOptions: OptionPillGroupOption<BasketballTeamChoice>[] =
    activeLetters.map((letter) => ({
      value: letter,
      label: `Team ${letter}`,
    }));

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
                options={pillOptions}
                value={pillValueForTeam(
                  teamByPlayerId[playerId],
                  activeLetterSet,
                )}
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
