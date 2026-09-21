/**
 * Re-derive basketball round_entries for a season using the current
 * calculateBasketballRound formula (fixed scale × OpenSkill ordinal movement,
 * with the house line absorbing Bayesian drift).
 *
 * Usage:
 *   npx tsx scripts/recalculate-season.ts              # dry run
 *   npx tsx scripts/recalculate-season.ts --execute     # apply updates
 *   npx tsx scripts/recalculate-season.ts --season 2    # target season id
 *
 * Requires linked Supabase CLI (`supabase db query --linked`).
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  calculateBasketballRound,
  parseBasketballMatchFromRoundSnapshot,
  parseBasketballScoringSystemFromRoundSnapshot,
  type BasketballMatchInput,
} from "../src/features/game-types/basketball.ts";

type RoundRow = {
  round_id: string;
  created_at: string;
  summary_text: string | null;
  settings_snapshot: Record<string, unknown> | string | null;
};

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute");
  const seasonIdx = argv.indexOf("--season");
  const seasonId =
    seasonIdx >= 0 && argv[seasonIdx + 1]
      ? Number(argv[seasonIdx + 1])
      : null;
  return { execute, seasonId };
}

function extractJsonValue(stdout: string): unknown {
  const start = stdout.search(/[\[{]/);
  if (start < 0) {
    throw new Error("Could not find JSON in supabase db query output.");
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stdout.length; i += 1) {
    const ch = stdout[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      depth += 1;
    } else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(stdout.slice(start, i + 1));
      }
    }
  }
  throw new Error("Unterminated JSON in supabase db query output.");
}

function parseLinkedQueryJson(stdout: string): unknown {
  const parsed = extractJsonValue(stdout);
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Array.isArray((parsed as { rows?: unknown }).rows)
  ) {
    return (parsed as { rows: unknown[] }).rows;
  }
  return parsed;
}

function runLinkedQuery(sql: string): unknown {
  const result = spawnSync(
    "supabase",
    ["db", "query", "--linked", "--output", "json", sql],
    {
      encoding: "utf8",
      cwd: join(import.meta.dirname, ".."),
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `supabase db query failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return parseLinkedQueryJson(result.stdout);
}

function normalizeSnapshot(
  value: RoundRow["settings_snapshot"],
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

function escapeLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function main() {
  const { execute, seasonId } = parseArgs(process.argv.slice(2));

  const seasonFilter =
    seasonId === null
      ? `r.basketball_season_id = (
           SELECT id FROM public.basketball_seasons WHERE is_active = true
           ORDER BY id DESC LIMIT 1
         )`
      : `r.basketball_season_id = ${Number.isInteger(seasonId) ? seasonId : "NULL"}`;

  if (seasonId !== null && !Number.isInteger(seasonId)) {
    throw new Error("--season must be an integer season id");
  }

  console.log(
    seasonId === null
      ? "Fetching rounds for active basketball season…"
      : `Fetching rounds for basketball season ${seasonId}…`,
  );

  const rounds = runLinkedQuery(`
    SELECT r.id as round_id, r.created_at, r.summary_text, r.settings_snapshot
    FROM public.rounds r
    WHERE r.game_type_id = 'basketball'
      AND ${seasonFilter}
    ORDER BY r.created_at ASC, r.id ASC;
  `) as RoundRow[];

  if (!Array.isArray(rounds)) {
    throw new Error("Expected rounds array from query.");
  }

  console.log(`Fetched ${rounds.length} rounds`);

  const priorRounds: BasketballMatchInput[] = [];
  const updateStatements: string[] = [];
  let entryUpdates = 0;
  let skippedManual = 0;
  let skippedUnparseable = 0;

  for (const round of rounds) {
    const snapshot = normalizeSnapshot(round.settings_snapshot);
    const meta = snapshot?.metadata as Record<string, unknown> | undefined;
    if (meta?.manualInput === true) {
      // Manual-input rounds are hand-entered, player-zero-sum, and carry no
      // house line, so their deltas are not ours to re-derive — skip rewriting
      // them. They still feed the OpenSkill replay on exactly the same terms
      // as the live app: the client replays every round the season query
      // returns (`fetchBasketballRoundHistory`, no manualInput filter) and
      // keeps the ones that parse. Manual rounds normally omit
      // scoreTeamA/scoreTeamB, so `parseBasketball...` returns null and they
      // drop out of the replay here too. Keeping this conditional push (rather
      // than an unconditional `continue`) is what keeps the script's priors
      // byte-identical to the app's for the rare manual round that does carry
      // scores.
      skippedManual += 1;
      const match = parseBasketballMatchFromRoundSnapshot(snapshot);
      if (match) {
        priorRounds.push(match);
      }
      continue;
    }

    const match = parseBasketballMatchFromRoundSnapshot(snapshot);
    if (!match) {
      skippedUnparseable += 1;
      continue;
    }

    const scoringSystem = parseBasketballScoringSystemFromRoundSnapshot(snapshot);
    const result = calculateBasketballRound({
      priorRounds,
      match,
      scoringSystem,
    });

    priorRounds.push(match);

    for (const entry of result.entries) {
      updateStatements.push(
        `UPDATE public.round_entries SET point_delta = ${entry.pointDelta} ` +
          `WHERE round_id = '${escapeLiteral(round.round_id)}' ` +
          `AND player_id = ${entry.playerId};`,
      );
      entryUpdates += 1;
    }

    // Persist the house line into the round metadata so the ledger stays
    // auditable: players + house = 0 for every basketball round.
    updateStatements.push(
      `UPDATE public.rounds SET summary_text = '${escapeLiteral(result.summary)}', ` +
        `settings_snapshot = jsonb_set(COALESCE(settings_snapshot, '{}'::jsonb), ` +
        `'{metadata,basketballHousePointDelta}', '${result.houseDelta}') ` +
        `WHERE id = '${escapeLiteral(round.round_id)}';`,
    );
  }

  console.log(
    `Prepared ${updateStatements.length} SQL statements ` +
      `(${entryUpdates} entry updates; skipped manual=${skippedManual}, unparseable=${skippedUnparseable})`,
  );

  if (updateStatements.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  const sql = updateStatements.join("\n");

  if (!execute) {
    const outPath = join(import.meta.dirname, "recalculate-season.sql");
    writeFileSync(outPath, sql, "utf8");
    console.log(`Dry run — SQL written to ${outPath}`);
    console.log("Sample updates:");
    for (const line of updateStatements.slice(0, 6)) {
      console.log(`  ${line}`);
    }
    console.log("Re-run with --execute to apply.");
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "mulberry-recalc-"));
  const tmpPath = join(dir, "recalculate-season.sql");
  writeFileSync(tmpPath, sql, "utf8");
  console.log(`Executing updates via ${tmpPath}…`);
  const result = spawnSync(
    "supabase",
    ["db", "query", "--linked", "-f", tmpPath],
    {
      encoding: "utf8",
      cwd: join(import.meta.dirname, ".."),
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  console.log("Done — season round_entries recalculated with current formula.");
}

main();
