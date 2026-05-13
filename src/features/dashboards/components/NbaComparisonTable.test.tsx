import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NbaComparisonTable } from "./NbaComparisonTable";

describe("NbaComparisonTable", () => {
  it("renders Previously on a second row when previousMatchName is set", () => {
    render(
      <NbaComparisonTable
        rows={[
          {
            playerName: "Alex",
            nbaMatchName: "Stephen Curry",
            fitScore: 0.7,
            previousMatchName: "Damian Lillard",
          },
        ]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Pro match" })).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Stephen Curry")).toBeInTheDocument();
    expect(screen.getByText(/Previously:/)).toBeInTheDocument();
    expect(screen.getByText("Damian Lillard")).toBeInTheDocument();
  });

  it("does not render Previously when previousMatchName is absent", () => {
    render(
      <NbaComparisonTable
        rows={[{ playerName: "Alex", nbaMatchName: "Stephen Curry", fitScore: 0.7 }]}
      />,
    );
    expect(screen.queryByText(/Previously:/)).not.toBeInTheDocument();
  });
});
