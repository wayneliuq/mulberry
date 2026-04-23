import { NavLink, Outlet } from "react-router-dom";

const navigationItems = [
  { label: "Games", to: "/" },
  { label: "Leaderboards", to: "/leaderboards" },
  { label: "Admin", to: "/admin" },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Friendly competition</p>
          <h1 className="app-title">Mulberry</h1>
          <p className="subtitle">
            Mobile-first scorekeeping, history, leaderboards, and settlements.
          </p>
        </div>
      </header>

      <nav className="tab-nav" aria-label="Primary">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "tab-link tab-link-active" : "tab-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
