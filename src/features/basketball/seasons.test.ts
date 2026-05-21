import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatNextSeasonNotice,
  getNextSeasonBoundaryAfter,
  isInstantInSeason,
  zonedDateTimeToUtc,
} from "./seasons";

describe("basketball seasons", () => {
  it("detects half-open season membership", () => {
    const season = {
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-06-01T00:00:00.000Z",
    };
    expect(isInstantInSeason(new Date("2026-01-01T00:00:00.000Z"), season)).toBe(
      true,
    );
    expect(isInstantInSeason(new Date("2026-06-01T00:00:00.000Z"), season)).toBe(
      false,
    );
  });

  it("finds next boundary after mid-May 2026 as June 21", () => {
    const may20 = zonedDateTimeToUtc(2026, 5, 20, 12, 0, 0);
    const next = getNextSeasonBoundaryAfter(may20);
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "numeric",
      day: "numeric",
    }).format(next);
    expect(label).toBe("6/21");
  });

  it("formats countdown notice", () => {
    const now = zonedDateTimeToUtc(2026, 5, 20, 12, 0, 0);
    const next = zonedDateTimeToUtc(2026, 6, 21, 0, 0, 0);
    const text = formatNextSeasonNotice(next, now);
    expect(text).toMatch(/New season starts on June 21, 2026/);
    expect(text).toMatch(/\d+ days away/);
    expect(daysUntil(next, now)).toBeGreaterThan(0);
  });
});
