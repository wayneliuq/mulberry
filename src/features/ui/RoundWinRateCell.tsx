import {
  roundWinStats,
  winRateAriaLabel,
  winRateBarClass,
} from "./roundWinRate";
import { scoreClassForSignedValue } from "./tableDisplay";

type RoundWinRateRow = {
  roundsWon: number;
  roundsLost: number;
};

export function RoundWinRateCell({ row }: { row: RoundWinRateRow }) {
  const stats = roundWinStats(row.roundsWon, row.roundsLost);

  if (stats.total === 0 || stats.pct === null) {
    return <span className="win-rate-empty">—</span>;
  }

  return (
    <div className="win-rate-cell">
      <div
        className="win-rate-bar"
        role="img"
        aria-label={winRateAriaLabel(stats)}
      >
        <span className="win-rate-midpoint" aria-hidden />
        <span
          className={`win-rate-fill ${winRateBarClass(stats.pct)}`}
          style={{ width: `${stats.pct}%` }}
          aria-hidden
        />
      </div>
      <div className="win-rate-meta">
        <span className={`win-rate-pct ${scoreClassForSignedValue(stats.pct - 50)}`}>
          {stats.pct}%
        </span>
        <span className="win-rate-count">{stats.total} rnd</span>
      </div>
    </div>
  );
}
