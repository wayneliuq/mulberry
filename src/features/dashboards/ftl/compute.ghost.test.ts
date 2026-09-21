import { describe, expect, it } from "vitest";
import { buildFtlDashboardMetrics } from "./compute";
import type { FtlDashboardData } from "./types";

/**
 * The FTL dashboard had no ghost filter at all: `fetchFtlDashboardData` did not
 * even read `is_score_neutral_hidden`, so a ghost showed up by name in the
 * ranked sections and by raw id in "Biggest Pots" once it was deactivated.
 */

const GHOST_ID = 64;

function buildSeason(options: { withGhost: boolean }): FtlDashboardData {
  const players = [
    { id: 1, displayName: "Alice", familyId: "red" },
    { id: 2, displayName: "Bob", familyId: "blue" },
    { id: 3, displayName: "Cara", familyId: "red" },
    { id: 4, displayName: "Duke", familyId: "green" },
  ];

  const rounds = [];
  const roundEntries = [];
  for (let idx = 1; idx <= 24; idx += 1) {
    const roundId = `r-${idx}`;
    const won = idx % 3 !== 0;
    const ghostPlays = options.withGhost && idx % 2 === 0;
    // The ghost fills in on the landlord side, so it lands in the landlord
    // win-rate, frequency, alliance and streak sections as well as the pots.
    const landlordSideSelections = ghostPlays ? [1, GHOST_ID] : [1, 2];
    rounds.push({
      roundId,
      gameId: "g-1",
      createdAt: `2026-04-${String((idx % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
      landlordSideSelections,
      numBombs: idx % 3,
      gameMultiplier: 1 + (idx % 2),
      outcome: won ? ("won" as const) : ("lost" as const),
    });

    const participants = ghostPlays ? [1, 2, 3, 4, GHOST_ID] : [1, 2, 3, 4];
    for (const playerId of participants) {
      const onLandlord = landlordSideSelections.includes(playerId);
      const playerWon = onLandlord === won;
      roundEntries.push({
        roundId,
        playerId,
        pointDelta: playerId === GHOST_ID ? 0 : playerWon ? 2 : -2,
      });
    }
  }

  return {
    players,
    rounds,
    roundEntries,
    ghostPlayerIds: options.withGhost ? [GHOST_ID] : [],
  };
}

function allRenderedText(data: FtlDashboardData): string[] {
  const metrics = buildFtlDashboardMetrics(data);
  const rows = [
    ...metrics.sections.flatMap((section) => section.rows),
    ...metrics.splitSections.flatMap((section) => [
      ...section.positiveRows,
      ...section.negativeRows,
    ]),
  ];
  return rows.flatMap((row) => [row.label, row.details]);
}

describe("fight-the-landlord dashboard ghost exclusion", () => {
  it("never names a ghost in a row label or detail line", () => {
    const text = allRenderedText(buildSeason({ withGhost: true }));

    expect(text.length).toBeGreaterThan(0);
    for (const value of text) {
      expect(value).not.toContain(String(GHOST_ID));
    }
  });

  it("leaks the ghost id when it is not declared, proving the filter is load-bearing", () => {
    const undeclared = buildSeason({ withGhost: true });
    const text = allRenderedText({ ...undeclared, ghostPlayerIds: [] });

    expect(text.some((value) => value.includes(String(GHOST_ID)))).toBe(true);
  });

  it("does not count a ghost as an eligible player", () => {
    const metrics = buildFtlDashboardMetrics(buildSeason({ withGhost: true }));
    const withoutGhost = buildFtlDashboardMetrics(
      buildSeason({ withGhost: false }),
    );

    expect(metrics.diagnostics.eligiblePlayers).toBe(
      withoutGhost.diagnostics.eligiblePlayers,
    );
  });
});
