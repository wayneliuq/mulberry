import { useEffect, useRef, useState } from "react";
import { copy } from "../ui/copy";
import {
  basketballTeamSizes,
  BASKETBALL_TEAM_COUNT_OPTIONS,
  clampBasketballTeamCount,
  MIN_BASKETBALL_TEAM_COUNT,
} from "./basketballTeams";

type BasketballPickTeamsDialogProps = {
  /** Unlocked players the balancer would split. */
  playerCount: number;
  /** Roster size the balancer refuses to auto-split above. */
  maxPlayers: number;
  onConfirm: (teamCount: number) => void;
  onCancel: () => void;
};

const TITLE_ID = "basketball-pick-teams-dialog-title";

/**
 * Team count is chosen here and nowhere else.
 *
 * It used to live in a pill row on the game page, which meant the count was a
 * persistent page-level setting that had to be set *before* reaching for "Pick
 * teams". Folding it into the dialog costs one extra click and makes the two
 * decisions — how many teams, and go — a single act. The count resets to 2 each
 * time the dialog opens, because two teams is the overwhelmingly common case
 * and a stale 5 from last week is a worse default than a fresh 2.
 */
export function BasketballPickTeamsDialog({
  playerCount,
  maxPlayers,
  onConfirm,
  onCancel,
}: BasketballPickTeamsDialogProps) {
  const [teamCount, setTeamCount] = useState(MIN_BASKETBALL_TEAM_COUNT);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const tooFewPlayers = playerCount < teamCount;
  const tooManyPlayers = playerCount > maxPlayers;
  const blockedReason = tooManyPlayers
    ? copy.gameView.pickTeamsTooManyPlayers
    : tooFewPlayers
      ? copy.gameView.pickTeamsNeedPlayers(teamCount)
      : null;

  const sizes = basketballTeamSizes(playerCount, teamCount);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="modal-card stack-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <strong id={TITLE_ID}>{copy.gameView.pickTeams}</strong>
        <p className="muted">{copy.gameView.pickTeamsDialogHelp(playerCount)}</p>

        <div className="stack-xs">
          <span>{copy.gameView.basketballTeamCountLabel}</span>
          <div
            className="inline-actions"
            role="group"
            aria-label={copy.gameView.basketballTeamCountLabel}
          >
            {BASKETBALL_TEAM_COUNT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pill-button${teamCount === option ? " pill-button--active" : ""}`}
                aria-pressed={teamCount === option}
                onClick={() => setTeamCount(clampBasketballTeamCount(option))}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/*
          One region that always exists, so changing the count announces the
          new split (or the reason it is refused) instead of relying on a live
          region being mounted at the same moment as its text. The blocked
          reason replaces the preview rather than sitting under it: previewing
          a split for a roster the balancer will refuse only contradicts the
          error next to it.
        */}
        <div aria-live="polite">
          {blockedReason ? (
            <p className="form-error">{blockedReason}</p>
          ) : sizes.length > 0 ? (
            <p className="muted">{copy.gameView.pickTeamsSizePreview(sizes)}</p>
          ) : null}
        </div>

        <div className="inline-actions">
          <button
            type="button"
            className="primary-button"
            disabled={blockedReason !== null}
            onClick={() => onConfirm(teamCount)}
          >
            {copy.gameView.pickTeamsConfirm}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            {copy.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
