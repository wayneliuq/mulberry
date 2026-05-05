import type { ReactNode } from "react";

export function MetricCard({
  id,
  title,
  actions,
  children,
}: {
  id: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article id={id} className="card stack-sm dashboard-card">
      <div className="card-header">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </article>
  );
}
