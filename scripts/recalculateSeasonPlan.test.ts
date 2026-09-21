import { describe, expect, it } from "vitest";
import {
  planSeasonRecalculation,
  sqlNumberLiteral,
  type BasketballRoundRow,
} from "./recalculateSeasonPlan.ts";
import { buildBasketballScoredRoundEntries } from "../src/features/game-types/basketballRoundDraft.ts";

function autoRound(
  round_id: string,
  teamAPlayerIds: number[],
  teamBPlayerIds: number[],
  scoreTeamA: number,
  scoreTeamB: number,
): BasketballRoundRow {
  return {
    round_id,
    settings_snapshot: {
      metadata: {
        mode: "basketball",
        teamAPlayerIds,
        teamBPlayerIds,
        scoreTeamA,
        scoreTeamB,
      },
    },
  };
}

function manualRound(
  round_id: string,
  teamAPlayerIds: number[],
  teamBPlayerIds: number[],
  scoreTeamA: number,
  scoreTeamB: number,
): BasketballRoundRow {
  const row = autoRound(round_id, teamAPlayerIds, teamBPlayerIds, scoreTeamA, scoreTeamB);
  (row.settings_snapshot as { metadata: Record<string, unknown> }).metadata.manualInput =
    true;
  return row;
}

const NAMES = new Map([
  [1, "Ann"],
  [2, "Bo"],
  [3, "Cy"],
  [99, "Ghost"],
]);

function plan(rounds: BasketballRoundRow[], ghosts: number[] = []) {
  return planSeasonRecalculation({
    rounds,
    ghostPlayerIds: new Set(ghosts),
    playerNameById: NAMES,
  });
}

describe("planSeasonRecalculation", () => {
  it("wraps the rewrite in one transaction", () => {
    const result = plan([autoRound("r1", [1], [2], 7, 3)]);
    expect(result.statements[0]).toBe("BEGIN;");
    expect(result.statements.at(-1)).toBe("COMMIT;");
    expect(result.roundsRewritten).toBe(1);
  });

  it("emits no statements at all when there is nothing to rewrite", () => {
    const result = plan([manualRound("m1", [1], [2], 7, 3)]);
    expect(result.statements).toEqual([]);
    expect(result.skippedManual).toBe(1);
  });

  it("writes ghost entries as exactly zero and puts their movement in the house", () => {
    const result = plan([autoRound("r1", [1, 99], [2, 3], 11, 7)], [99]);

    expect(result.statements).toContain(
      "UPDATE public.round_entries SET point_delta = 0 " +
        "WHERE round_id = 'r1' AND player_id = 99;",
    );

    // The house line in the SQL must equal -(sum of the written entries).
    const written = result.statements
      .filter((s) => s.startsWith("UPDATE public.round_entries"))
      .map((s) => Number(/point_delta = (\S+) /.exec(s)![1]));
    const houseDelta = Number(
      /basketballHousePointDelta\}', '(\S+?)'\)/.exec(
        result.statements.find((s) => s.startsWith("UPDATE public.rounds"))!,
      )![1],
    );
    expect(written.reduce((a, b) => a + b, 0) + houseDelta).toBeCloseTo(0, 10);

    // And it must be the ghost-aware house, not the plain one.
    const expected = buildBasketballScoredRoundEntries({
      seasonHistory: [],
      teamAPlayerIds: [1, 99],
      teamBPlayerIds: [2, 3],
      scoreTeamA: 11,
      scoreTeamB: 7,
      ghostPlayerIds: new Set([99]),
    })!;
    expect(houseDelta).toBe(expected.houseDelta);
  });

  it("rebuilds summary_text in the live-app format", () => {
    const result = plan([autoRound("r1", [1, 99], [2], 7, 3)], [99]);
    const roundUpdate = result.statements.find((s) =>
      s.startsWith("UPDATE public.rounds"),
    )!;
    const summary = /summary_text = '(.*?)', settings_snapshot/.exec(roundUpdate)![1]!;
    // Roster order (team A then team B), ghost present at an unsigned 0
    // (`formatSignedPoints` only signs nonzero values), house last.
    expect(summary).toMatch(/^Ann [+-][\d.]+, Ghost 0, Bo [+-][\d.]+, House [+-]?[\d.]+$/);
  });

  it("never rewrites a manual round but still replays it as a prior", () => {
    const rounds = [
      manualRound("m1", [1], [2], 7, 0),
      autoRound("r2", [1], [2], 7, 5),
    ];
    const result = plan(rounds);

    expect(result.skippedManual).toBe(1);
    expect(result.roundsRewritten).toBe(1);
    expect(result.statements.some((s) => s.includes("'m1'"))).toBe(false);

    // r2's delta must match scoring it with m1 as its only prior.
    const withManualPrior = buildBasketballScoredRoundEntries({
      seasonHistory: [{ settingsSnapshot: rounds[0]!.settings_snapshot as Record<string, unknown> }],
      teamAPlayerIds: [1],
      teamBPlayerIds: [2],
      scoreTeamA: 7,
      scoreTeamB: 5,
      ghostPlayerIds: new Set(),
    })!;
    const p1 = withManualPrior.entries.find((e) => e.playerId === 1)!.pointDelta;
    expect(result.statements).toContain(
      `UPDATE public.round_entries SET point_delta = ${p1} ` +
        `WHERE round_id = 'r2' AND player_id = 1;`,
    );
  });

  it("excludes a round from its own prior history", () => {
    // Two identical matchups. If round 1 leaked into its own priors it would
    // score like round 2, and the two deltas would be equal.
    const result = plan([
      autoRound("r1", [1], [2], 7, 3),
      autoRound("r2", [1], [2], 7, 3),
    ]);
    const deltas = result.statements
      .filter((s) => s.includes("player_id = 1;"))
      .map((s) => Number(/point_delta = (\S+) /.exec(s)![1]));
    expect(deltas).toHaveLength(2);
    expect(deltas[0]).not.toBe(deltas[1]);

    // Round 1 specifically must be scored from an empty history.
    const fromScratch = buildBasketballScoredRoundEntries({
      seasonHistory: [],
      teamAPlayerIds: [1],
      teamBPlayerIds: [2],
      scoreTeamA: 7,
      scoreTeamB: 3,
      ghostPlayerIds: new Set(),
    })!;
    expect(deltas[0]).toBe(
      fromScratch.entries.find((e) => e.playerId === 1)!.pointDelta,
    );
  });

  it("counts unparseable rounds without emitting statements for them", () => {
    const result = plan([
      { round_id: "x1", settings_snapshot: null },
      { round_id: "x2", settings_snapshot: { metadata: { mode: "dixit" } } },
      { round_id: "x3", settings_snapshot: "not json" },
    ]);
    expect(result.skippedUnparseable).toBe(3);
    expect(result.statements).toEqual([]);
  });

  it("accepts a settings_snapshot delivered as a JSON string", () => {
    const result = plan([
      {
        round_id: "r1",
        settings_snapshot: JSON.stringify({
          metadata: {
            mode: "basketball",
            teamAPlayerIds: [1],
            teamBPlayerIds: [2],
            scoreTeamA: 7,
            scoreTeamB: 3,
          },
        }),
      },
    ]);
    expect(result.roundsRewritten).toBe(1);
  });

  it("escapes single quotes in display names", () => {
    const result = planSeasonRecalculation({
      rounds: [autoRound("r1", [1], [2], 7, 3)],
      ghostPlayerIds: new Set(),
      playerNameById: new Map([
        [1, "O'Brien"],
        [2, "Bo"],
      ]),
    });
    const roundUpdate = result.statements.find((s) =>
      s.startsWith("UPDATE public.rounds"),
    )!;
    expect(roundUpdate).toContain("O''Brien");
  });

  it("refuses to serialize a non-finite delta", () => {
    expect(() => sqlNumberLiteral(Number.NaN)).toThrow(/non-finite/);
    expect(() => sqlNumberLiteral(Number.POSITIVE_INFINITY)).toThrow(/non-finite/);
    expect(sqlNumberLiteral(-0)).toBe("0");
  });
});
