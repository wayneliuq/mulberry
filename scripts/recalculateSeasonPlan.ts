/**
 * Pure planning half of `recalculate-season.ts`.
 *
 * Kept in its own module with **no side effects and no I/O** so the part that
 * decides what production rows get rewritten is unit-testable: importing this
 * file can never reach Supabase. `recalculate-season.ts` is the I/O shell that
 * fetches rows, calls `planSeasonRecalculation`, and applies (or dry-runs) the
 * statements it returns.
 */
import {
  formatSignedPoints,
  parseBasketballMatchFromRoundSnapshot,
  parseBasketballScoringSystemFromRoundSnapshot,
} from "../src/features/game-types/basketball.ts";
import { buildBasketballScoredRoundEntries } from "../src/features/game-types/basketballRoundDraft.ts";

export type BasketballRoundRow = {
  round_id: string;
  settings_snapshot: Record<string, unknown> | string | null;
};

export type SeasonRecalculationPlan = {
  /** SQL to apply, already wrapped in a single transaction. Empty when nothing changes. */
  statements: string[];
  roundsRewritten: number;
  entryUpdates: number;
  /** `metadata.manualInput === true`: hand-entered, never rewritten. */
  skippedManual: number;
  /** No parseable basketball match in the snapshot (also covers non-basketball metadata). */
  skippedUnparseable: number;
  /** Parsed, but the scoring helper rejected the matchup (bad roster/scores). */
  skippedUnscorable: number;
};

export function normalizeSnapshot(
  value: BasketballRoundRow["settings_snapshot"],
): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
  return value;
}

export function escapeLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

/**
 * Serialize a ledger delta for SQL. `point_delta` is `double precision`
 * (migration 20260921000000) precisely so the stored value is bit-for-bit the
 * computed JS number; `String()` on a finite double round-trips exactly, and
 * Postgres accepts the exponent forms it can produce.
 */
export function sqlNumberLiteral(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Refusing to write non-finite point delta: ${value}`);
  }
  return String(value);
}

/**
 * Build the UPDATE statements that bring a season's stored basketball ledger
 * back in line with the production scoring path.
 *
 * `rounds` must already be in the same chronological order the app replays
 * (`created_at ASC, id ASC`, matching `fetchBasketballRoundHistory`).
 */
export function planSeasonRecalculation(input: {
  rounds: BasketballRoundRow[];
  ghostPlayerIds: Set<number>;
  playerNameById: Map<number, string>;
}): SeasonRecalculationPlan {
  const { rounds, ghostPlayerIds, playerNameById } = input;

  // Snapshots are parsed once and the full season history is materialized
  // up-front. Every round is retained — manual and unparseable ones included —
  // because that is exactly what the app hands the scorer
  // (`fetchBasketballRoundHistory` applies no manualInput filter and
  // `priorBasketballMatchesFromSeasonHistory` drops whatever fails to parse).
  // Slicing by index then gives each round a prior history that excludes
  // itself, matching the app's save-time call where the round does not exist yet.
  const snapshots = rounds.map((round) => normalizeSnapshot(round.settings_snapshot));
  const seasonHistory = snapshots.map((settingsSnapshot) => ({ settingsSnapshot }));

  const body: string[] = [];
  let roundsRewritten = 0;
  let entryUpdates = 0;
  let skippedManual = 0;
  let skippedUnparseable = 0;
  let skippedUnscorable = 0;

  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index]!;
    const snapshot = snapshots[index];
    const meta = snapshot?.metadata as Record<string, unknown> | undefined;

    if (meta?.manualInput === true) {
      // Hand-entered, player-zero-sum, no house line: not ours to re-derive.
      // Still a prior for later rounds (above) if it carries scores.
      skippedManual += 1;
      continue;
    }

    const match = parseBasketballMatchFromRoundSnapshot(snapshot);
    if (!match) {
      skippedUnparseable += 1;
      continue;
    }

    const draft = buildBasketballScoredRoundEntries({
      seasonHistory: seasonHistory.slice(0, index),
      teamAPlayerIds: match.teamAPlayerIds,
      teamBPlayerIds: match.teamBPlayerIds,
      scoreTeamA: match.scoreTeamA,
      scoreTeamB: match.scoreTeamB,
      ghostPlayerIds,
      scoringSystem: parseBasketballScoringSystemFromRoundSnapshot(snapshot),
    });
    if (!draft) {
      skippedUnscorable += 1;
      continue;
    }

    roundsRewritten += 1;

    for (const entry of draft.entries) {
      body.push(
        `UPDATE public.round_entries SET point_delta = ${sqlNumberLiteral(entry.pointDelta)} ` +
          `WHERE round_id = '${escapeLiteral(round.round_id)}' ` +
          `AND player_id = ${entry.playerId};`,
      );
      entryUpdates += 1;
    }

    // Byte-identical to the summary the live app writes at submit time
    // (GameViewPage basketball save): roster order, ghosts shown at +0, house last.
    const summaryText = [
      ...draft.entries.map((entry) => {
        const displayName = playerNameById.get(entry.playerId) ?? entry.playerId;
        return `${displayName} ${formatSignedPoints(entry.pointDelta)}`;
      }),
      `House ${formatSignedPoints(draft.houseDelta)}`,
    ].join(", ");

    // Persist the house line into the round metadata so the ledger stays
    // auditable: players + house = 0 for every basketball round.
    body.push(
      `UPDATE public.rounds SET summary_text = '${escapeLiteral(summaryText)}', ` +
        `settings_snapshot = jsonb_set(COALESCE(settings_snapshot, '{}'::jsonb), ` +
        `'{metadata,basketballHousePointDelta}', '${sqlNumberLiteral(draft.houseDelta)}') ` +
        `WHERE id = '${escapeLiteral(round.round_id)}';`,
    );
  }

  // All-or-nothing: a season rewritten halfway is worse than one not rewritten,
  // because the OpenSkill replay that produced the later statements assumed the
  // earlier ones landed.
  const statements =
    body.length === 0 ? [] : ["BEGIN;", ...body, "COMMIT;"];

  return {
    statements,
    roundsRewritten,
    entryUpdates,
    skippedManual,
    skippedUnparseable,
    skippedUnscorable,
  };
}
