import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoundWinRateCell } from "./RoundWinRateCell";

describe("RoundWinRateCell", () => {
  it("renders bar, percent, and round count", () => {
    render(<RoundWinRateCell row={{ roundsWon: 78, roundsLost: 30 }} />);

    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("108 rnd")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "72% round win rate, 78 wins and 30 losses in 108 decided rounds",
    );
  });

  it("renders em dash when there are no decided rounds", () => {
    render(<RoundWinRateCell row={{ roundsWon: 0, roundsLost: 0 }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
