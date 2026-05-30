import { describe, expect, it } from "vitest";
import {
  fitScoreClass,
  rankCellClass,
  scoreClassForSignedValue,
} from "./tableDisplay";

describe("tableDisplay", () => {
  it("maps signed values to score classes", () => {
    expect(scoreClassForSignedValue(3)).toBe("score-positive");
    expect(scoreClassForSignedValue(-1)).toBe("score-negative");
    expect(scoreClassForSignedValue(0)).toBe("score-neutral");
  });

  it("maps ranks to emphasis classes", () => {
    expect(rankCellClass(1)).toContain("rank-1");
    expect(rankCellClass(2)).toContain("rank-2");
    expect(rankCellClass(3)).toContain("rank-3");
    expect(rankCellClass(4)).not.toContain("rank-1");
  });

  it("maps fit scores to dashboard thresholds", () => {
    expect(fitScoreClass(0.8)).toBe("score-positive");
    expect(fitScoreClass(0.3)).toBe("score-negative");
    expect(fitScoreClass(0.5)).toBe("score-neutral");
  });
});
