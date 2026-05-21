/** Canonical timezone for basketball solstice season boundaries. */
export const BASKETBALL_SEASON_TIMEZONE = "America/Los_Angeles";

export type BasketballSeasonRecord = {
  id: number;
  seasonNumber: number;
  displayName: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  schemaVersion: number;
};

const MS_PER_DAY = 86_400_000;

/** Half-open season window: startsAt <= instant < endsAt. */
export function isInstantInSeason(
  instant: Date,
  season: Pick<BasketballSeasonRecord, "startsAt" | "endsAt">,
): boolean {
  const t = instant.getTime();
  return t >= Date.parse(season.startsAt) && t < Date.parse(season.endsAt);
}

/** Next solstice boundary after `instant` in America/Los_Angeles. */
export function getNextSeasonBoundaryAfter(instant: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BASKETBALL_SEASON_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(instant);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const candidates: Date[] = [];

  const pushBoundary = (y: number, m: number, d: number) => {
    candidates.push(zonedDateTimeToUtc(y, m, d, 0, 0, 0));
  };

  pushBoundary(year, 6, 21);
  pushBoundary(year, 12, 21);
  pushBoundary(year + 1, 6, 21);
  pushBoundary(year + 1, 12, 21);

  const nowMs = instant.getTime();
  const future = candidates
    .filter((d) => d.getTime() > nowMs)
    .sort((a, b) => a.getTime() - b.getTime());

  if (future.length === 0) {
    return pushBoundaryReturn(year + 2, 6, 21);
  }
  return future[0]!;
}

function pushBoundaryReturn(y: number, m: number, d: number): Date {
  return zonedDateTimeToUtc(y, m, d, 0, 0, 0);
}

/**
 * Converts a local America/Los_Angeles wall time to UTC Date.
 * Uses iterative offset correction for DST transitions.
 */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BASKETBALL_SEASON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  for (let i = 0; i < 4; i += 1) {
    const parts = formatter.formatToParts(guess);
    const zy = Number(parts.find((p) => p.type === "year")?.value);
    const zm = Number(parts.find((p) => p.type === "month")?.value);
    const zd = Number(parts.find((p) => p.type === "day")?.value);
    const zh = Number(parts.find((p) => p.type === "hour")?.value);
    const zmin = Number(parts.find((p) => p.type === "minute")?.value);
    const zs = Number(parts.find((p) => p.type === "second")?.value);

    const desiredLocalMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualLocalMs = Date.UTC(zy, zm - 1, zd, zh, zmin, zs);
    const diff = desiredLocalMs - actualLocalMs;
    if (diff === 0) {
      return guess;
    }
    guess.setTime(guess.getTime() + diff);
  }
  return guess;
}

export function formatSeasonBoundaryDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BASKETBALL_SEASON_TIMEZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

export function daysUntil(target: Date, from: Date = new Date()): number {
  const diff = target.getTime() - from.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / MS_PER_DAY);
}

export function formatNextSeasonNotice(
  nextSeasonStartsAt: Date,
  now: Date = new Date(),
): string {
  const dateLabel = formatSeasonBoundaryDate(nextSeasonStartsAt);
  const days = daysUntil(nextSeasonStartsAt, now);
  const dayLabel = days === 1 ? "day" : "days";
  return `New season starts on ${dateLabel} - ${days} ${dayLabel} away`;
}

export function nbaCompStorageKeyForSeason(seasonId: number): string {
  return `mulberry:nba-comp:v1:season-${seasonId}`;
}
