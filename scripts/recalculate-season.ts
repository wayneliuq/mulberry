/**
 * Re-derive basketball round_entries for a season using the production
 * ghost-aware scoring path (`buildBasketballScoredRoundEntries`): fixed
 * scale × OpenSkill ordinal movement, ghosts zeroed with their raw movement
 * absorbed by the house line.
 *
 * I/O shell only — the decision of what to rewrite lives in the pure,
 * unit-tested `recalculateSeasonPlan.ts`.
 *
 * Usage:
 *   npx tsx scripts/recalculate-season.ts              # dry run
 *   npx tsx scripts/recalculate-season.ts --execute     # apply updates
 *   npx tsx scripts/recalculate-season.ts --season 2    # target season id
 *
 * Transport is the Supabase Management API via the credential-surrogate helper
 * (`supabase-mgmt db-query`), not the Supabase CLI: this environment has a
 * Management API PAT but no linked-CLI login and no database password, so
 * `supabase db query --linked` cannot authenticate. The helper is read-only
 * unless `--write` is passed, so a dry run physically cannot mutate the project.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  planSeasonRecalculation,
  type BasketballRoundRow,
} from "./recalculateSeasonPlan.ts";

type RoundRow = BasketballRoundRow & {
  created_at: string;
  summary_text: string | null;
};

type PlayerRow = {
  id: number;
  display_name: string;
  is_score_neutral_hidden: boolean;
};

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute");
  const seasonIdx = argv.indexOf("--season");
  if (seasonIdx < 0) {
    return { execute, seasonId: null };
  }

  // A typo'd flag must not silently fall through to "the active season" on a
  // script that writes to production.
  const raw = argv[seasonIdx + 1];
  const seasonId = raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isInteger(seasonId)) {
    throw new Error("--season requires an integer season id");
  }
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

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "naemlxqtvwcfjannpoua";
const MGMT_BIN =
  process.env.SUPABASE_MGMT_BIN ??
  join(homedir(), "workspace/skills/supabase/bin/supabase-mgmt");

/**
 * Run SQL through the Management API helper.
 *
 * `write` gates the helper's `--write` flag, which in turn decides whether the
 * server runs the statement in a read-only transaction. Callers on the read
 * path must leave it false so a bug here cannot become a production mutation.
 */
function runQuery(sql: string, options: { write?: boolean } = {}): unknown {
  const dir = mkdtempSync(join(tmpdir(), "mulberry-sql-"));
  const sqlPath = join(dir, "query.sql");
  writeFileSync(sqlPath, sql, "utf8");

  const args = [MGMT_BIN, "db-query", PROJECT_REF, "-f", sqlPath];
  if (options.write === true) {
    args.push("--write");
  }
  const result = spawnSync("python3", args, {
    encoding: "utf8",
    cwd: join(import.meta.dirname, ".."),
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `supabase-mgmt db-query failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  if (result.stderr.trim().length > 0) {
    console.warn(result.stderr.trim());
  }
  return parseLinkedQueryJson(result.stdout);
}

function main() {
  const { execute, seasonId } = parseArgs(process.argv.slice(2));

  const seasonFilter =
    seasonId === null
      ? `r.basketball_season_id = (
           SELECT id FROM public.basketball_seasons WHERE is_active = true
           ORDER BY id DESC LIMIT 1
         )`
      : `r.basketball_season_id = ${seasonId}`;

  console.log("Fetching players (ghost flags and display names)…");
  const players = runQuery(
    `SELECT id, display_name, is_score_neutral_hidden FROM public.players;`,
  ) as PlayerRow[];
  if (!Array.isArray(players)) {
    throw new Error("Expected players array from query.");
  }

  const ghostPlayerIds = new Set<number>();
  const playerNameById = new Map<number, string>();
  for (const player of players) {
    playerNameById.set(Number(player.id), player.display_name);
    if (player.is_score_neutral_hidden === true) {
      ghostPlayerIds.add(Number(player.id));
    }
  }
  const ghostLabels = [...ghostPlayerIds].map(
    (id) => `${playerNameById.get(id) ?? id} (${id})`,
  );
  console.log(
    ghostLabels.length === 0
      ? "Found 0 ghost players."
      : `Found ${ghostLabels.length} ghost players: ${ghostLabels.join(", ")}`,
  );

  console.log(
    seasonId === null
      ? "Fetching rounds for active basketball season…"
      : `Fetching rounds for basketball season ${seasonId}…`,
  );

  // Order must match `fetchBasketballRoundHistory` so the replay is identical.
  const rounds = runQuery(`
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

  const plan = planSeasonRecalculation({ rounds, ghostPlayerIds, playerNameById });

  console.log(
    `Prepared ${plan.statements.length} SQL statements ` +
      `(${plan.roundsRewritten} rounds, ${plan.entryUpdates} entry updates; ` +
      `skipped manual=${plan.skippedManual}, unparseable=${plan.skippedUnparseable}, ` +
      `unscorable=${plan.skippedUnscorable})`,
  );

  if (plan.statements.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  const sql = plan.statements.join("\n");

  if (!execute) {
    const outPath = join(import.meta.dirname, "recalculate-season.sql");
    writeFileSync(outPath, sql, "utf8");
    console.log(`Dry run — SQL written to ${outPath}`);
    console.log("Sample updates:");
    for (const line of plan.statements.slice(0, 6)) {
      console.log(`  ${line}`);
    }
    console.log("Re-run with --execute to apply.");
    return;
  }

  console.log(`Executing ${plan.statements.length} statements against ${PROJECT_REF}…`);
  runQuery(sql, { write: true });
  console.log("Done — season round_entries recalculated with current formula.");
}

main();
