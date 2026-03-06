import { useAdminSession } from "../features/admin/AdminSessionContext";

const adminSections = [
  "Players and renames",
  "Family membership",
  "Audit history",
  "Restricted maintenance actions",
];

export function AdminConsolePage() {
  const { isAdmin } = useAdminSession();

  return (
    <section className="stack-lg">
      <article className="card stack-sm">
        <div className="card-header">
          <div>
            <p className="card-eyebrow">Admin console</p>
            <h2>Maintenance tools</h2>
          </div>
          <span className={isAdmin ? "pill pill-success" : "pill"}>
            {isAdmin ? "Ready for admin actions" : "Locked"}
          </span>
        </div>

        <p className="muted">
          This page will host player, family, and history-safe admin workflows.
        </p>

        <ul className="list-reset stack-sm">
          {adminSections.map((section) => (
            <li key={section} className="list-item muted">
              {section}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
