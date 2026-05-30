import { Fragment } from "react";
import type { NbaComparisonRow } from "../basketball/types";
import {
  fitScoreClass,
  fitScorePercent,
} from "../../ui/tableDisplay";

export function NbaComparisonTable({ rows }: { rows: NbaComparisonRow[] }) {
  if (rows.length === 0) {
    return <p className="muted">Not enough qualifying rounds yet.</p>;
  }
  return (
    <div className="standings-table-container">
      <table className="standings-table nba-comp-table">
        <thead>
          <tr>
            <th scope="col" className="th-sticky-name">
              Player
            </th>
            <th scope="col">Pro match</th>
            <th scope="col" className="numeric">
              Fit
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const valueClass = fitScoreClass(row.fitScore);
            const hasPrevious =
              typeof row.previousMatchName === "string" &&
              row.previousMatchName.trim().length > 0 &&
              row.previousMatchName !== row.nbaMatchName;
            return (
              <Fragment key={`${row.playerName}-${row.nbaMatchName}`}>
                <tr
                  className={`nba-comp-main-row${hasPrevious ? " nba-comp-main-row-with-previous" : ""}`}
                >
                  <td className="td-primary td-sticky-name">
                    <span className="nba-comp-player-cell">
                      {row.isNew ? (
                        <span className="nba-comp-new-marker" aria-label="New comparison">
                          <span className="nba-comp-new-dot" aria-hidden />
                          <span className="pill pill-small nba-comp-new-pill">New</span>
                        </span>
                      ) : null}
                      <span>{row.playerName}</span>
                    </span>
                  </td>
                  <td>{row.nbaMatchName}</td>
                  <td className="numeric">
                    <div className="fit-score-cell">
                      <span
                        className="fit-score-bar"
                        role="presentation"
                        aria-hidden
                      >
                        <span
                          className={`fit-score-bar-fill ${valueClass}`}
                          style={{ width: `${fitScorePercent(row.fitScore)}%` }}
                        />
                      </span>
                      <span className={valueClass}>{row.fitScore.toFixed(2)}</span>
                    </div>
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
