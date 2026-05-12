import type { NbaComparisonRow } from "../basketball/types";

export function NbaComparisonTable({ rows }: { rows: NbaComparisonRow[] }) {
  if (rows.length === 0) {
    return <p className="muted">Not enough qualifying rounds yet.</p>;
  }
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>NBA match</th>
            <th>Fit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const valueClass =
              row.fitScore > 0.66
                ? "score-positive"
                : row.fitScore < 0.45
                  ? "score-negative"
                  : "score-neutral";
            return (
              <tr key={`${row.playerName}-${row.nbaMatchName}`}>
                <td>{row.playerName}</td>
                <td>{row.nbaMatchName}</td>
                <td>
                  <span className={valueClass}>{row.fitScore.toFixed(2)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
