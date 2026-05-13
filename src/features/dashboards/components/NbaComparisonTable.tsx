import { Fragment } from "react";
import type { NbaComparisonRow } from "../basketball/types";

export function NbaComparisonTable({ rows }: { rows: NbaComparisonRow[] }) {
  if (rows.length === 0) {
    return <p className="muted">Not enough qualifying rounds yet.</p>;
  }
  return (
    <div className="table-shell">
      <table className="nba-comp-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Pro match</th>
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
            const hasPrevious =
              typeof row.previousMatchName === "string" &&
              row.previousMatchName.trim().length > 0 &&
              row.previousMatchName !== row.nbaMatchName;
            return (
              <Fragment key={`${row.playerName}-${row.nbaMatchName}`}>
                <tr
                  className={`nba-comp-main-row${hasPrevious ? " nba-comp-main-row-with-previous" : ""}`}
                >
                  <td>{row.playerName}</td>
                  <td>{row.nbaMatchName}</td>
                  <td>
                    <span className={valueClass}>{row.fitScore.toFixed(2)}</span>
                  </td>
                </tr>
                {hasPrevious ? (
                  <tr className="nba-comp-previous-row">
                    <td colSpan={3}>
                      <span className="nba-comp-previous-label">Previously:</span>{" "}
                      <span className="nba-comp-previous-name">{row.previousMatchName}</span>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
