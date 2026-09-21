import { describe, expect, it } from "vitest";
import { buildBasketballScoredRoundEntries } from "./basketballRoundDraft";

function makeHistory(n: number) {
  // n prior rounds of 1v1, player 1 beats player 2 each time.
  return Array.from({ length: n }, () => ({
    settingsSnapshot: {
      metadata: {
        mode: "basketball",
        teamAPlayerIds: [1],
        teamBPlayerIds: [2],
        scoreTeamA: 7,
        scoreTeamB: 3,
      },
    },
  }));
}

describe("buildBasketballScoredRoundEntries ghost handling", () => {
  it("zeroes ghost entries exactly", () => {
    const draft = buildBasketballScoredRoundEntries({
      seasonHistory: makeHistory(3),
      teamAPlayerIds: [1, 99],
      teamBPlayerIds: [2, 3],
      scoreTeamA: 7,
      scoreTeamB: 5,
      ghostPlayerIds: new Set([99]),
    });
    expect(draft).not.toBeNull();
    const ghost = draft!.entries.find((e) => e.playerId === 99);
    expect(ghost).toBeDefined();
    // Exactly zero, not "rounds to zero" — a ghost must never move the ledger.
    expect(ghost!.pointDelta).toBe(0);
  });

  it("absorbs ghost raw movement into the house line, not teammates", () => {
    const match = {
      seasonHistory: makeHistory(3),
      teamAPlayerIds: [1, 99],
      teamBPlayerIds: [2, 3],
      scoreTeamA: 7,
      scoreTeamB: 5,
    };
    const withGhost = buildBasketballScoredRoundEntries({
      ...match,
      ghostPlayerIds: new Set([99]),
    })!;
    // The same matchup scored with no ghosts at all. Player 99 occupies a
    // roster slot in both, so this isolates the ledger treatment from the
    // OpenSkill team-strength effect of the extra body.
    const raw = buildBasketballScoredRoundEntries({
      ...match,
      ghostPlayerIds: new Set(),
    })!;
    expect(withGhost).not.toBeNull();
    expect(raw).not.toBeNull();

    // Teammates are untouched — exactly, not approximately. Redistributing the
    // ghost's share onto player 1 would show up here.
    for (const entry of withGhost.entries) {
      if (entry.playerId === 99) continue;
      const rawDelta = raw.entries.find((e) => e.playerId === entry.playerId)!.pointDelta;
      expect(entry.pointDelta).toBe(rawDelta);
    }

    const rawGhost = raw.entries.find((e) => e.playerId === 99)!.pointDelta;
    expect(rawGhost).not.toBe(0); // the movement being absorbed is real
    expect(withGhost.houseDelta).toBeCloseTo(raw.houseDelta + rawGhost, 10);
    // House = -(sum of the entries actually kept).
    const keptSum = withGhost.entries.reduce((s, e) => s + e.pointDelta, 0);
    expect(withGhost.houseDelta).toBeCloseTo(-keptSum, 10);
  });

  it("balances players + house to exactly zero every round", () => {
    const draft = buildBasketballScoredRoundEntries({
      seasonHistory: makeHistory(10),
      teamAPlayerIds: [1, 2, 99],
      teamBPlayerIds: [3, 4],
      scoreTeamA: 11,
      scoreTeamB: 7,
      ghostPlayerIds: new Set([99]),
    });
    expect(draft).not.toBeNull();
    const total =
      draft!.entries.reduce((s, e) => s + e.pointDelta, 0) + draft!.houseDelta;
    expect(total).toBeCloseTo(0, 10);
  });

  it("keeps ghost entries in roster order with zero delta", () => {
    const draft = buildBasketballScoredRoundEntries({
      seasonHistory: makeHistory(1),
      teamAPlayerIds: [99, 1],
      teamBPlayerIds: [2],
      scoreTeamA: 7,
      scoreTeamB: 4,
      ghostPlayerIds: new Set([99]),
    });
    expect(draft).not.toBeNull();
    // Team A then team B, in the order given: the summary line reads by side,
    // and ghosts stay visible at +0 rather than being dropped.
    expect(draft!.entries.map((e) => e.playerId)).toEqual([99, 1, 2]);
    expect(draft!.entries[0]!.pointDelta).toBe(0);
  });

  it("replays parseable manual rounds as priors", () => {
    // A manual-input round that still carries scores feeds the OpenSkill
    // replay exactly like the live app (`fetchBasketballRoundHistory` has no
    // manualInput filter). The scorer has no notion of manualInput at all —
    // that a manual round's own entries are never rewritten is enforced one
    // level up, in `planSeasonRecalculation`.
    const manualSnapshot = {
      metadata: {
        mode: "basketball",
        manualInput: true,
        teamAPlayerIds: [1],
        teamBPlayerIds: [2],
        scoreTeamA: 7,
        scoreTeamB: 0,
      },
    };
    const withManual = buildBasketballScoredRoundEntries({
      seasonHistory: [{ settingsSnapshot: manualSnapshot }],
      teamAPlayerIds: [1],
      teamBPlayerIds: [2],
      scoreTeamA: 7,
      scoreTeamB: 5,
      ghostPlayerIds: new Set(),
    });
    const withoutManual = buildBasketballScoredRoundEntries({
      seasonHistory: [],
      teamAPlayerIds: [1],
      teamBPlayerIds: [2],
      scoreTeamA: 7,
      scoreTeamB: 5,
      ghostPlayerIds: new Set(),
    });
    expect(withManual).not.toBeNull();
    expect(withoutManual).not.toBeNull();
    // Player 1 already proved stronger in the manual round, so the same
    // scoreline moves the rating less than it would with no history.
    const deltaWith = Math.abs(
      withManual!.entries.find((e) => e.playerId === 1)!.pointDelta,
    );
    const deltaWithout = Math.abs(
      withoutManual!.entries.find((e) => e.playerId === 1)!.pointDelta,
    );
    expect(deltaWith).toBeLessThan(deltaWithout);
  });

  it("returns null for invalid input instead of throwing", () => {
    const base = {
      seasonHistory: [],
      teamAPlayerIds: [1],
      teamBPlayerIds: [2],
      scoreTeamA: 7,
      scoreTeamB: 5,
      ghostPlayerIds: new Set<number>(),
    };
    // Empty team (mid-edit form state).
    expect(
      buildBasketballScoredRoundEntries({ ...base, teamAPlayerIds: [] }),
    ).toBeNull();
    // Negative / non-integer / blank scores.
    expect(
      buildBasketballScoredRoundEntries({ ...base, scoreTeamA: -1 }),
    ).toBeNull();
    expect(
      buildBasketballScoredRoundEntries({ ...base, scoreTeamA: Number.NaN }),
    ).toBeNull();
    expect(
      buildBasketballScoredRoundEntries({ ...base, scoreTeamA: 7.5 }),
    ).toBeNull();
    // Bad rosters: these reach `calculateBasketballRound`'s zod schema, which
    // throws. The draft helper must swallow that into null — it runs inside a
    // React useMemo and inside the recalculation script's loop.
    expect(
      buildBasketballScoredRoundEntries({ ...base, teamAPlayerIds: [1, 1] }),
    ).toBeNull();
    expect(
      buildBasketballScoredRoundEntries({ ...base, teamBPlayerIds: [1] }),
    ).toBeNull();
  });
});
