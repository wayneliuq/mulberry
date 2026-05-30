import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  status?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  status,
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-header-text">
        {eyebrow ? <p className="card-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {(actions || status) && (
        <div className="section-header-actions">
          {status}
          {actions}
        </div>
      )}
    </div>
  );
}
