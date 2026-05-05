import type { RankedMetricRow } from "../basketball/types";

export function RankedTable({
  rows,
  valueHeader = "Value",
}: {
  rows: RankedMetricRow[];
  valueHeader?: string;
}) {
  if (rows.length === 0) {
    return <p className="muted">Not enough qualifying rounds yet.</p>;
  }
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th className="th-rank">#</th>
            <th>Player(s)</th>
            <th>{valueHeader}</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const valueClass =
              row.value > 0 ? "score-positive" : row.value < 0 ? "score-negative" : "score-neutral";
            return (
              <tr key={`${row.label}-${index}`}>
                <td className="td-rank">{index + 1}</td>
                <td>{row.label}</td>
                <td>
                  <span className={valueClass}>{row.valueLabel}</span>
                </td>
                <td>{row.details}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
