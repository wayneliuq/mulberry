import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAdminSession } from "../admin/AdminSessionContext";
import { IconGlyph } from "../ui/IconGlyph";
import { copy, pageTitleForPath, pageTitleLabel } from "../ui/copy";

const navigationItems = [
  { label: copy.nav.games, to: "/", icon: "games" as const, end: true },
  {
    label: copy.nav.leaderboards,
    to: "/leaderboards",
    icon: "leaderboard" as const,
    end: false,
  },
  {
    label: copy.nav.dashboards,
    to: "/dashboards",
    icon: "dashboard" as const,
    end: false,
  },
  { label: copy.nav.admin, to: "/admin", icon: "admin" as const, end: false },
];

export function AppLayout() {
  const location = useLocation();
  const { isAdmin } = useAdminSession();
  const titleKey = pageTitleForPath(location.pathname);
  const title = pageTitleLabel(titleKey);

  return (
    <div className="app-scaffold">
      <header className="app-bar">
        <div className="app-bar-title-block">
          <h1 className="app-bar-title">{title}</h1>
        </div>
        <div className="app-bar-actions">
          <span
            className={isAdmin ? "pill pill-success pill-compact" : "pill pill-compact"}
            aria-live="polite"
          >
            {isAdmin ? copy.editMode.editing : copy.editMode.viewOnly}
          </span>
        </div>
      </header>

      <main className="page-shell page-shell--with-bottom-nav">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/" ||
                    location.pathname.startsWith("/games/")
                  : isActive;
              return active
                ? "bottom-nav-item bottom-nav-item-active"
                : "bottom-nav-item";
            }}
          >
            <IconGlyph name={item.icon} size={22} className="bottom-nav-icon" />
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
