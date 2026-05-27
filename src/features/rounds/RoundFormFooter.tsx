import type { ReactNode } from "react";
import {
  isRoundEntryTotalBalanced,
  ZERO_SUM_ROUND_TOLERANCE,
} from "../game-types/manualPointBalance";
import { formatPoints } from "../../lib/format";

type RoundFormFooterProps = {
  submitDisabled?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  cancelLabel?: string;
  imbalanceTotal?: number | null;
  onBalanceToZero?: () => void;
  submitError?: string | null;
  backLabel?: string;
  onBack?: () => void;
  children?: ReactNode;
};

export function RoundFormFooter({
  submitDisabled = false,
  submitLabel = "Save round",
  onCancel,
  cancelLabel = "Cancel",
  imbalanceTotal = null,
  onBalanceToZero,
  submitError,
  backLabel,
  onBack,
  children,
}: RoundFormFooterProps) {
  const showImbalance =
    imbalanceTotal !== null &&
    !isRoundEntryTotalBalanced(imbalanceTotal, ZERO_SUM_ROUND_TOLERANCE);

  return (
    <>
      {children}
      {showImbalance ? (
        <p className="form-error" role="status">
          Round total: {formatPoints(imbalanceTotal)} (not zero-sum). Use Balance
          to zero to spread the difference evenly across scoring players.
        </p>
      ) : null}
      {submitError ? <p className="form-error">{submitError}</p> : null}
      <div className="inline-actions">
        <button
          type="submit"
          className="primary-button"
          disabled={submitDisabled}
        >
          {submitLabel}
        </button>
        {backLabel && onBack ? (
          <button type="button" className="secondary-button" onClick={onBack}>
            {backLabel}
          </button>
        ) : null}
        {showImbalance && onBalanceToZero ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onBalanceToZero}
          >
            Balance to zero
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </>
  );
}
