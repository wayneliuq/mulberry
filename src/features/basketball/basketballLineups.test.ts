import { describe, expect, it } from "vitest";
import {
  basketballLineupApplication,
  basketballLineupId,
  basketballLineups,
  MAX_BASKETBALL_LINEUPS_PER_GAME,
} from "./basketballLineups";

function preset(
  labelNumber: number,
  overrides: Partial<{
    id: string;
    teamAPlayerIds: number[];
    teamBPlayerIds: number[];
    teams: number[][] | null;
    createdAt: string;
  }> = {},
) {
  return {
    id: overrides.id ?? `preset-${labelNumber}`,
    labelNumber,
    teamAPlayerIds: overrides.teamAPlayerIds ?? [1, 2],
    teamBPlayerIds: overrides.teamBPlayerIds ?? [3, 4],
    teams: overrides.teams,
    createdAt:
      overrides.createdAt ??
      new Date(Date.UTC(2026, 8, 21, 0, labelNumber)).toISOString(),
  };
}

describe("basketballLineupId", () => {
  it("maps the first 26 lineups onto A–Z", () => {
    expect(basketballLineupId(1)).toBe("A");
    expect(basketballLineupId(2)).toBe("B");
    expect(basketballLineupId(3)).toBe("C");
    expect(basketballLineupId(26)).toBe("Z");
  });

  it("widens instead of wrapping past Z", () => {
    expect(basketballLineupId(27)).toBe("AA");
    expect(basketballLineupId(28)).toBe("AB");
    expect(basketballLineupId(52)).toBe("AZ");
    expect(basketballLineupId(53)).toBe("BA");
    expect(basketballLineupId(702)).toBe("ZZ");
    expect(basketballLineupId(703)).toBe("AAA");
  });

  it("never reuses an id for a different label number", () => {
    const ids = new Set<string>();
    for (let labelNumber = 1; labelNumber <= 200; labelNumber += 1) {
      ids.add(basketballLineupId(labelNumber));
    }
    expect(ids.size).toBe(200);
  });

  it("clamps label numbers below the database's 1 floor", () => {
    expect(basketballLineupId(0)).toBe("A");
    expect(basketballLineupId(-4)).toBe("A");
    expect(basketballLineupId(Number.NaN)).toBe("A");
    expect(basketballLineupId(2.7)).toBe("B");
  });
});

describe("basketballLineups", () => {
  it("lists lineups in pick order with ids that follow the label numbers", () => {
    // Presets arrive newest-first from the API.
    const entries = basketballLineups([preset(3), preset(2), preset(1)]);
    expect(entries.map((entry) => entry.lineupId)).toEqual(["A", "B", "C"]);
    expect(entries.map((entry) => entry.presetId)).toEqual([
      "preset-1",
      "preset-2",
      "preset-3",
    ]);
  });

  it("gives every lineup of a game a distinct id", () => {
    const entries = basketballLineups(
      Array.from({ length: 30 }, (_, index) => preset(index + 1)),
    );
    expect(new Set(entries.map((entry) => entry.lineupId)).size).toBe(30);
    expect(entries.at(-1)?.lineupId).toBe("AD");
  });

  it("keeps ids stable as later lineups are picked", () => {
    const first = basketballLineups([preset(1), preset(2)]);
    const later = basketballLineups([preset(1), preset(2), preset(3), preset(4)]);
    expect(later.slice(0, 2).map((entry) => entry.lineupId)).toEqual(
      first.map((entry) => entry.lineupId),
    );
  });

  it("keeps the ids of surviving lineups when older rows are pruned", () => {
    // The 26-row FIFO cap drops lineup A; B does not slide into its letter.
    const entries = basketballLineups(
      Array.from({ length: 26 }, (_, index) => preset(index + 2)),
    );
    expect(entries[0]?.lineupId).toBe("B");
    expect(entries.at(-1)?.lineupId).toBe("AA");
  });

  it("reports the team count each lineup was picked into", () => {
    const entries = basketballLineups([
      preset(1),
      preset(2, {
        teams: [[1], [2], [3], [4], [5]],
      }),
    ]);
    expect(entries.map((entry) => entry.teamCount)).toEqual([2, 5]);
  });

  it("suffixes rather than shadowing if two rows share a label number", () => {
    const entries = basketballLineups([
      preset(1, { id: "preset-a", createdAt: "2026-09-21T00:00:00.000Z" }),
      preset(1, { id: "preset-b", createdAt: "2026-09-21T01:00:00.000Z" }),
    ]);
    expect(entries.map((entry) => entry.lineupId)).toEqual(["A", "A (2)"]);
    expect(entries.map((entry) => entry.presetId)).toEqual([
      "preset-a",
      "preset-b",
    ]);
  });
});

describe("basketballLineupApplication", () => {
  it("restores a two-team lineup", () => {
    expect(
      basketballLineupApplication(
        preset(1, { teamAPlayerIds: [1, 3], teamBPlayerIds: [2, 4] }),
        [1, 2, 3, 4],
      ),
    ).toEqual({
      teamCount: 2,
      assignments: { 1: "A", 2: "B", 3: "A", 4: "B" },
    });
  });

  it("restores every partition of a wider lineup and its team count", () => {
    expect(
      basketballLineupApplication(
        preset(2, {
          teamAPlayerIds: [1],
          teamBPlayerIds: [2],
          teams: [[1], [2], [3], [4], [5]],
        }),
        [1, 2, 3, 4, 5],
      ),
    ).toEqual({
      teamCount: 5,
      assignments: { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" },
    });
  });

  it("drops players who are no longer unlocked and frees the rest", () => {
    expect(
      basketballLineupApplication(
        preset(1, { teamAPlayerIds: [1, 99], teamBPlayerIds: [2] }),
        [1, 2, 3],
      ),
    ).toEqual({
      teamCount: 2,
      assignments: { 1: "A", 2: "B", 3: "none" },
    });
  });

  it("applies an old lineup exactly, however many lineups came after it", () => {
    const lineups = basketballLineups([
      preset(1, {
        teamAPlayerIds: [1],
        teamBPlayerIds: [2],
        teams: [[1], [2], [3], [4]],
      }),
      ...Array.from({ length: 20 }, (_, index) => preset(index + 2)),
    ]);

    const lineupA = lineups.find((entry) => entry.lineupId === "A");
    expect(lineupA).toBeDefined();
    expect(basketballLineupApplication(lineupA!.preset, [1, 2, 3, 4])).toEqual({
      teamCount: 4,
      assignments: { 1: "A", 2: "B", 3: "C", 4: "D" },
    });
  });
});

describe("MAX_BASKETBALL_LINEUPS_PER_GAME", () => {
  it("covers the single-letter ids", () => {
    expect(MAX_BASKETBALL_LINEUPS_PER_GAME).toBe(26);
    expect(basketballLineupId(MAX_BASKETBALL_LINEUPS_PER_GAME)).toBe("Z");
  });
});
