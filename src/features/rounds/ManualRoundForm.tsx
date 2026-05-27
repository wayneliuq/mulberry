import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  PlayerSortButtons,
  type PlayerSortMode,
} from "../players/SortablePlayerList";

export type ManualRoundPlayer = {
  playerId: number;
  displayName: string;
  /** Locked to 0 points (ghost / score-neutral hidden). */
  forceZero?: boolean;
};

type ManualRoundFormProps = {
  players: ManualRoundPlayer[];
  inputs: Record<number, string>;
  onInputsChange: Dispatch<SetStateAction<Record<number, string>>>;
  pointStep: number;
  helperText: string;
  sortMode: PlayerSortMode;
  onSortChange: (mode: PlayerSortMode) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitError?: string | null;
  backLabel?: string;
  onBack?: () => void;
};

function adjustPointInput(
  setter: Dispatch<SetStateAction<Record<number, string>>>,
  playerId: number,
  delta: number,
  clampToTwoDecimals: (value: number) => number,
) {
  setter((prev) => {
    const raw = Number(prev[playerId] ?? 0);
    const next = clampToTwoDecimals(raw + delta);
    return { ...prev, [playerId]: String(next) };
  });
}

export function ManualRoundForm({
  players,
  inputs,
  onInputsChange,
  pointStep,
  helperText,
  sortMode,
  onSortChange,
  onSubmit,
  onCancel,
  submitError,
  backLabel,
  onBack,
}: ManualRoundFormProps) {
  const clampToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="stack-sm" onSubmit={handleSubmit}>
      <p className="muted">{helperText}</p>
      <PlayerSortButtons sortMode={sortMode} onSortChange={onSortChange} />
      {players.map((player) => {
        const forceZero = Boolean(player.forceZero);
        return (
          <label key={player.playerId} className="stack-xs">
            <span>
              {player.displayName}
              {forceZero ? (
                <span className="pill pill-small"> Ghost · always 0</span>
              ) : null}
            </span>
            <div className="inline-actions point-input-row">
              <button
                type="button"
                className="icon-button"
                disabled={forceZero}
                aria-label={`Decrease ${player.displayName} by ${pointStep}`}
                onClick={() =>
                  adjustPointInput(
                    onInputsChange,
                    player.playerId,
                    -pointStep,
                    clampToTwoDecimals,
                  )
                }
              >
                −
              </button>
              <input
                type="number"
                step="0.01"
                value={forceZero ? "0" : (inputs[player.playerId] ?? "0")}
                readOnly={forceZero}
                disabled={forceZero}
                onChange={(event) =>
                  onInputsChange((current) => ({
                    ...current,
                    [player.playerId]: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="icon-button"
                disabled={forceZero}
                aria-label={`Increase ${player.displayName} by ${pointStep}`}
                onClick={() =>
                  adjustPointInput(
                    onInputsChange,
                    player.playerId,
                    pointStep,
                    clampToTwoDecimals,
                  )
                }
              >
                +
              </button>
            </div>
          </label>
        );
      })}
      {submitError ? <p className="form-error">{submitError}</p> : null}
      <div className="inline-actions">
        <button type="submit" className="primary-button">
          Save round
        </button>
        {backLabel && onBack ? (
          <button type="button" className="secondary-button" onClick={onBack}>
            {backLabel}
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
