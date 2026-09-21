import { describe, expect, it } from "vitest";
import { buildBasketballDashboardMetrics } from "./compute";
import type { BasketballDashboardData } from "../../../lib/api/types";

/**
 * Regression cover for the ghost leak: a score-neutral-hidden fill-in used to
 * reach the dashboard as a "player" named after its own row id (Wayne saw
 * `64`). `players` excludes ghosts, but the stored round rosters and entries
 * still name them and every section falls back to `String(playerId)`.
 */

const GHOST_ID = 64;

function buildSeason(options: { withGhost: boolean }): BasketballDashboardData {
  const players = [
    { id: 1, displayName: "Alice", familyId: "red" },
    { id: 2, displayName: "Bob", familyId: "blue" },
    { id: 3, displayName: "Cara", familyId: "red" },
    { id: 4, displayName: "Duke", familyId: "green" },
    { id: 5, displayName: "Eve", familyId: "blue" },
    { id: 6, displayName: "Finn", familyId: "green" },
  ];

  const rounds = [];
  const roundEntries = [];
  for (let idx = 1; idx <= 30; idx += 1) {
    const aWon = idx % 3 !== 0;
    // The ghost fills in on team A for roughly half the season — often enough
    // to clear every per-player minimum the sections apply.
    const teamA = options.withGhost && idx % 2 === 0 ? [1, 2, 3, GHOST_ID] : [1, 2, 3];
    const teamB = [4, 5, 6];
    rounds.push({
      roundId: `r-${idx}`,
      gameId: "g-1",
      roundNumber: idx,
      createdAt: `2026-03-${String((idx % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
      teamAPlayerIds: teamA,
      teamBPlayerIds: teamB,
      scoreTeamA: aWon ? 11 : 7,
      scoreTeamB: aWon ? 7 : 11,
    });
    for (const playerId of teamA) {
      roundEntries.push({
        roundId: `r-${idx}`,
        playerId,
        // Ghost ledger entries are zeroed by the Season 2 rewrite; the leak was
        // never about points, it was about the id reaching the label.
        pointDelta: playerId === GHOST_ID ? 0 : aWon ? 1 : -1,
      });
    }
    for (const playerId of teamB) {
      roundEntries.push({
        roundId: `r-${idx}`,
        playerId,
        pointDelta: aWon ? -1 : 1,
      });
    }
  }

  return {
    seasonId: 2,
    players,
    rounds,
    roundEntries,
    ghostPlayerIds: options.withGhost ? [GHOST_ID] : [],
  };
}

function allRenderedLabels(data: BasketballDashboardData): string[] {
  const metrics = buildBasketballDashboardMetrics({ data, maxRounds: 500 });
  return [
    ...metrics.sections.flatMap((section) => section.rows.map((row) => row.label)),
    ...metrics.splitSections.flatMap((section) => [
      ...section.positiveRows.map((row) => row.label),
      ...section.negativeRows.map((row) => row.label),
    ]),
    ...metrics.nbaComparisons.map((row) => row.playerName),
  ];
}

describe("basketball dashboard ghost exclusion", () => {
  it("never labels a row with a ghost player", () => {
    const labels = allRenderedLabels(buildSeason({ withGhost: true }));

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label).not.toContain(String(GHOST_ID));
    }
  });

  it("produces the same rows as a season the ghost never played in", () => {
    const withGhost = allRenderedLabels(buildSeason({ withGhost: true }));
    const withoutGhost = allRenderedLabels(buildSeason({ withGhost: false }));

    expect(withGhost).toEqual(withoutGhost);
  });

  it("leaks the ghost id when it is not declared, proving the filter is load-bearing", () => {
    // Same season, ghost id withheld from `ghostPlayerIds` — the old behaviour.
    const undeclared = buildSeason({ withGhost: true });
    const labels = allRenderedLabels({ ...undeclared, ghostPlayerIds: [] });

    expect(labels.some((label) => label.includes(String(GHOST_ID)))).toBe(true);
  });

  it("keeps a ghost out of teammate and opponent pairings", () => {
    const metrics = buildBasketballDashboardMetrics({
      data: buildSeason({ withGhost: true }),
      maxRounds: 500,
    });

    const pairLabels = [
      ...(metrics.splitSections.find((section) => section.id === "combos")
        ?.positiveRows ?? []),
      ...(metrics.splitSections.find((section) => section.id === "trios")
        ?.positiveRows ?? []),
      ...(metrics.sections.find((section) => section.id === "rivalry")?.rows ?? []),
    ].map((row) => row.label);

    expect(pairLabels.length).toBeGreaterThan(0);
    for (const label of pairLabels) {
      expect(label).not.toContain(String(GHOST_ID));
    }
  });
});
