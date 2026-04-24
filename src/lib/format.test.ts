import { describe, expect, it } from "vitest";
import { formatPoints } from "./format";

describe("formatPoints", () => {
  it("shows up to one decimal for values at or below 100", () => {
    expect(formatPoints(12)).toBe("12");
    expect(formatPoints(12.34)).toBe("12.3");
    expect(formatPoints(100)).toBe("100");
    expect(formatPoints(100.04)).toBe("100");
  });

  it("rounds to nearest integer for values above 100 by magnitude", () => {
    expect(formatPoints(100.4)).toBe("100");
    expect(formatPoints(100.5)).toBe("101");
    expect(formatPoints(-100.6)).toBe("-101");
  });
});
