import { describe, expect, it } from "vitest";
import { winRateBarClass } from "./roundWinRate";

describe("winRateBarClass", () => {
  it("maps win rate to solid bar color classes", () => {
    expect(winRateBarClass(72)).toBe("win-rate-fill-above");
    expect(winRateBarClass(38)).toBe("win-rate-fill-below");
    expect(winRateBarClass(50)).toBe("win-rate-fill-even");
  });
});
