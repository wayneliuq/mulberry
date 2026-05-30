import type { SVGProps } from "react";

export type IconGlyphName =
  | "all"
  | "cards"
  | "meeple"
  | "basketball"
  | "lock"
  | "unlock"
  | "trash"
  | "games"
  | "leaderboard"
  | "dashboard"
  | "admin"
  | "sort-asc"
  | "sort-desc";

type IconGlyphProps = {
  name: IconGlyphName;
  size?: number;
  title?: string;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">;

export function IconGlyph({
  name,
  size = 16,
  title,
  className,
  ...rest
}: IconGlyphProps) {
  const decorative = title === undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative}
      role={decorative ? undefined : "img"}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {name === "all" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18" />
          <path d="M12 3a15 15 0 0 0 0 18" />
        </>
      ) : null}
      {name === "cards" ? (
        <>
          <rect x="7.5" y="5" width="10" height="14" rx="2" />
          <path d="M7.5 8.5h10" />
          <path d="M6 8.5v8.5a2 2 0 0 0 2 2" />
        </>
      ) : null}
      {name === "meeple" ? (
        <>
          <path d="M9 5.25a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z" />
          <path d="M18.6 5.25a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z" />
          <path d="M12 9.5a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z" />
          <path d="M8.4 9.8 6 14.5l2.4 1.1 1.6-2.8 1 5.7h2l1-5.7 1.6 2.8 2.4-1.1-2.4-4.7" />
        </>
      ) : null}
      {name === "basketball" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5v17" />
          <path d="M3.8 12h16.4" />
          <path d="M6.2 6.2c2.2 2.2 2.2 9.4 0 11.6" />
          <path d="M17.8 6.2c-2.2 2.2-2.2 9.4 0 11.6" />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
        </>
      ) : null}
      {name === "unlock" ? (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8.5a4 4 0 0 1 7-2.5" />
        </>
      ) : null}
      {name === "trash" ? (
        <>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </>
      ) : null}
      {name === "games" ? (
        <>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M8 12h8" />
        </>
      ) : null}
      {name === "leaderboard" ? (
        <>
          <path d="M8 21V10" />
          <path d="M12 21V3" />
          <path d="M16 21v-6" />
        </>
      ) : null}
      {name === "dashboard" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      ) : null}
      {name === "admin" ? (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        </>
      ) : null}
      {name === "sort-asc" ? (
        <>
          <path d="M8 9l4-4 4 4" />
          <path d="M12 5v14" />
        </>
      ) : null}
      {name === "sort-desc" ? (
        <>
          <path d="M8 15l4 4 4-4" />
          <path d="M12 5v14" />
        </>
      ) : null}
    </svg>
  );
}
