import type { RankedMetricRow } from "../basketball/types";
import { rankCellClass, scoreClassForSignedValue } from "../../ui/tableDisplay";

export function RankedTable({
  rows,
  valueHeader = "Value",
  valueMinWidth,
}: {
  rows: RankedMetricRow[];
  valueHeader?: string;
  valueMinWidth?: string;
}) {
  if (rows.length === 0) {
    return <p className="muted">Not enough qualifying rounds yet.</p>;
  }
  return (
    <div className="standings-table-container">
      <table className="standings-table">
        <thead>
          <tr>
            <th scope="col" className="th-rank numeric">
              #
            </th>
            <th scope="col" className="th-sticky-name">
              Player(s)
            </th>
            <th scope="col" className="numeric" style={valueMinWidth ? { minWidth: valueMinWidth } : undefined}>
              {valueHeader}
            </th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rank = index + 1;
            const valueClass = scoreClassForSignedValue(row.value);
            return (
              <tr key={`${row.label}-${index}`}>
                <td className={rankCellClass(rank)}>
                  <span className="rank-chip">{rank}</span>
                </td>
                <td className="td-primary td-sticky-name">{row.label}</td>
                <td className="numeric" style={valueMinWidth ? { minWidth: valueMinWidth } : undefined}>
                  <span className={valueClass}>{row.valueLabel}</span>
                </td>
                <td className="td-secondary">{row.details}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
