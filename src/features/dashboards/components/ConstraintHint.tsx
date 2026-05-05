export function ConstraintHint({
  explanation,
  constraintLabel,
  topNLabel,
}: {
  explanation: string;
  constraintLabel: string;
  topNLabel: string;
}) {
  return (
    <div className="dashboard-constraint stack-xs">
      <p className="muted">{explanation}</p>
      <p className="dashboard-constraint-line">
        <strong>Constraint:</strong> {constraintLabel}
      </p>
      <p className="dashboard-constraint-line">
        <strong>Top-N:</strong> {topNLabel}
      </p>
    </div>
  );
}
