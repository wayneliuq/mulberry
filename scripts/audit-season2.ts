/**
 * READ-ONLY production audit of a basketball season's ledger.
 *
 * Replays every round through the *production* ghost-aware scoring path
 * (`buildBasketballScoredRoundEntries`) and compares the proposal against what
 * is stored in `round_entries`, so the report answers:
 *
 *   - stored vs proposed point deltas, per round and in aggregate
 *   - ghost deltas are exactly zero in the proposal (and whether they are stored that way)
 *   - players + house balances to zero on every round
 *   - the house total and how the absorbed movement is distributed across rounds
 *   - leaderboard eligibility: roundsWon + roundsLost > LEADERBOARD_MIN_ROUNDS,
 *     counting only nonzero point-delta entries, deduped on (round_id, player_id)
 *   - the exact point ordering of eligible players vs their OpenSkill ordinal ordering
 *
 * SAFETY: every request this script makes is a PostgREST GET. There is no write
 * path in this file and none may be added — use `recalculate-season.ts` for that.
 * Credentials come from the environment only; nothing is ever printed.
 *
 * Usage:
 *   SUPABASE_ANON_KEY=... npx tsx scripts/audit-season2.ts
 *   SUPABASE_ANON_KEY=... npx tsx scripts/audit-season2.ts --season 2
 */
import {
  baselineBasketballOrdinal,
  basketballOrdinalsAfterRounds,
  DEFAULT_BASKETBALL_LEDGER_SCALE,
  parseBasketballMatchFromRoundSnapshot,
  parseBasketballScoringSystemFromRoundSnapshot,
  priorBasketballMatchesFromSeasonHistory,
} from "../src/features/game-types/basketball.ts";
import { buildBasketballScoredRoundEntries } from "../src/features/game-types/basketballRoundDraft.ts";
import {
  aggregatePlayerRoundCounts,
  LEADERBOARD_MIN_ROUNDS,
} from "../src/lib/api/leaderboardFilter.ts";
import { normalizeSnapshot } from "./recalculateSeasonPlan.ts";

const BASE =
  process.env.SUPABASE_URL ?? "https://naemlxqtvwcfjannpoua.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY;
if (!ANON) {
  throw new Error("SUPABASE_ANON_KEY is required (env only; never hardcode).");
}

/** Deltas below this are floating-point dust, not a real disagreement. */
const EPSILON = 1e-9;

function parseSeasonId(argv: string[]): number {
  const idx = argv.indexOf("--season");
  if (idx < 0) {
    return 2;
  }
  const value = Number(argv[idx + 1]);
  if (!Number.isInteger(value)) {
    throw new Error("--season requires an integer season id");
  }
  return value;
}

/**
 * The only network primitive in this file: a paginated PostgREST GET.
 * Every caller must include an `order=` clause — offset pagination over an
 * unordered result can skip or duplicate rows, which would silently corrupt
 * the audit's arithmetic.
 */
async function getAll<T>(path: string): Promise<T[]> {
  if (!path.includes("order=")) {
    throw new Error(`Paginated GET without an order clause: ${path.split("?")[0]}`);
  }
  const rows: T[] = [];
  const pageSize = 1000;
  const separator = path.includes("?") ? "&" : "?";
  for (let offset = 0; ; offset += pageSize) {
    const res = await fetch(
      `${BASE}/rest/v1/${path}${separator}offset=${offset}&limit=${pageSize}`,
      {
        method: "GET",
        headers: { apikey: ANON!, Authorization: `Bearer ${ANON}` },
      },
    );
    if (!res.ok) {
      // Body may echo the request; it never contains the key, but keep it terse.
      throw new Error(`REST ${res.status} on ${path.split("?")[0]}`);
    }
    const page = (await res.json()) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

type RoundRow = {
  id: string;
  created_at: string;
  summary_text: string | null;
  settings_snapshot: Record<string, unknown> | string | null;
};
type EntryRow = {
  round_id: string;
  player_id: number;
  point_delta: number | null;
};
type PlayerRow = {
  id: number;
  display_name: string;
  is_score_neutral_hidden: boolean;
};

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

async function main() {
  const seasonId = parseSeasonId(process.argv.slice(2));

  const players = await getAll<PlayerRow>(
    "players?select=id,display_name,is_score_neutral_hidden&order=id.asc",
  );
  const ghostPlayerIds = new Set(
    players.filter((p) => p.is_score_neutral_hidden).map((p) => Number(p.id)),
  );
  const nameById = new Map(players.map((p) => [Number(p.id), p.display_name]));

  // Same order the app replays in (`fetchBasketballRoundHistory`).
  const rounds = await getAll<RoundRow>(
    `rounds?game_type_id=eq.basketball&basketball_season_id=eq.${seasonId}` +
      "&select=id,created_at,summary_text,settings_snapshot&order=created_at.asc,id.asc",
  );

  // Season-scoped via the FK embed so we never pull the whole entries table.
  const entries = await getAll<EntryRow & { rounds?: unknown }>(
    "round_entries?select=round_id,player_id,point_delta,rounds!inner(basketball_season_id)" +
      `&rounds.basketball_season_id=eq.${seasonId}&order=round_id.asc,player_id.asc`,
  );

  const storedByRound = new Map<string, EntryRow[]>();
  for (const entry of entries) {
    const list = storedByRound.get(entry.round_id) ?? [];
    list.push(entry);
    storedByRound.set(entry.round_id, list);
  }

  const snapshots = rounds.map((r) => normalizeSnapshot(r.settings_snapshot));
  const seasonHistory = snapshots.map((settingsSnapshot) => ({ settingsSnapshot }));

  let manual = 0;
  let unparseable = 0;
  let unscorable = 0;
  let roundsWithEntryMismatch = 0;
  let roundsNotBalanced = 0;
  let roundsMissingStoredEntry = 0;
  let ghostEntriesProposedNonzero = 0;
  let ghostEntriesStoredNonzero = 0;

  let houseTotal = 0;
  let houseAbsTotal = 0;
  let houseMaxAbs = 0;
  let housePositiveRounds = 0;
  let houseNegativeRounds = 0;

  let totalAbsDelta = 0;
  let maxAbsDelta = 0;

  const proposedTotals = new Map<number, number>();
  const storedTotals = new Map<number, number>();
  const proposedEntries: Array<{
    round_id: string;
    player_id: number;
    point_delta: number;
  }> = [];
  const worstRounds: Array<{
    roundId: string;
    createdAt: string;
    maxAbsDelta: number;
    storedSum: number;
    proposedSum: number;
  }> = [];
  const unbalancedRoundIds: string[] = [];

  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index]!;
    const snapshot = snapshots[index];
    const meta = snapshot?.metadata as Record<string, unknown> | undefined;
    const match = parseBasketballMatchFromRoundSnapshot(snapshot);

    // Stored totals cover every round, manual included — that is what the
    // leaderboard actually sums today.
    for (const stored of storedByRound.get(round.id) ?? []) {
      const value = Number(stored.point_delta ?? 0);
      storedTotals.set(
        Number(stored.player_id),
        (storedTotals.get(Number(stored.player_id)) ?? 0) + value,
      );
      if (ghostPlayerIds.has(Number(stored.player_id)) && Math.abs(value) > EPSILON) {
        ghostEntriesStoredNonzero += 1;
      }
    }

    if (meta?.manualInput === true) {
      // Hand-entered and player-zero-sum: a prior for the replay, never a
      // rewrite target. Its stored entries pass through to `proposedEntries`
      // so eligibility counts reflect the post-recalculation ledger.
      manual += 1;
      for (const stored of storedByRound.get(round.id) ?? []) {
        const value = Number(stored.point_delta ?? 0);
        proposedEntries.push({
          round_id: round.id,
          player_id: Number(stored.player_id),
          point_delta: value,
        });
        proposedTotals.set(
          Number(stored.player_id),
          (proposedTotals.get(Number(stored.player_id)) ?? 0) + value,
        );
      }
      continue;
    }

    if (!match) {
      unparseable += 1;
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
      unscorable += 1;
      continue;
    }

    const stored = storedByRound.get(round.id) ?? [];
    const storedByPlayer = new Map(
      stored.map((e) => [Number(e.player_id), Number(e.point_delta ?? 0)]),
    );

    let roundMismatch = false;
    let roundMaxAbsDelta = 0;
    let proposedSum = 0;

    for (const entry of draft.entries) {
      proposedSum += entry.pointDelta;
      proposedEntries.push({
        round_id: round.id,
        player_id: entry.playerId,
        point_delta: entry.pointDelta,
      });
      proposedTotals.set(
        entry.playerId,
        (proposedTotals.get(entry.playerId) ?? 0) + entry.pointDelta,
      );

      if (ghostPlayerIds.has(entry.playerId) && entry.pointDelta !== 0) {
        ghostEntriesProposedNonzero += 1;
      }

      const storedValue = storedByPlayer.get(entry.playerId);
      if (storedValue === undefined) {
        roundsMissingStoredEntry += 1;
        roundMismatch = true;
        continue;
      }
      const delta = Math.abs(storedValue - entry.pointDelta);
      if (delta > EPSILON) {
        roundMismatch = true;
      }
      roundMaxAbsDelta = Math.max(roundMaxAbsDelta, delta);
      totalAbsDelta += delta;
      maxAbsDelta = Math.max(maxAbsDelta, delta);
    }

    if (roundMismatch) {
      roundsWithEntryMismatch += 1;
    }
    worstRounds.push({
      roundId: round.id,
      createdAt: round.created_at,
      maxAbsDelta: round6(roundMaxAbsDelta),
      storedSum: round6([...storedByPlayer.values()].reduce((a, b) => a + b, 0)),
      proposedSum: round6(proposedSum),
    });

    houseTotal += draft.houseDelta;
    houseAbsTotal += Math.abs(draft.houseDelta);
    houseMaxAbs = Math.max(houseMaxAbs, Math.abs(draft.houseDelta));
    if (draft.houseDelta > 0) housePositiveRounds += 1;
    if (draft.houseDelta < 0) houseNegativeRounds += 1;

    if (Math.abs(proposedSum + draft.houseDelta) > EPSILON) {
      roundsNotBalanced += 1;
      unbalancedRoundIds.push(round.id);
    }
  }

  const autoRounds = rounds.length - manual - unparseable - unscorable;

  // Eligibility, on the production rule: distinct (round_id, player_id) rows
  // with a nonzero delta, and the count must EXCEED the threshold.
  const proposedRoundCounts = aggregatePlayerRoundCounts(proposedEntries);
  const storedRoundCounts = aggregatePlayerRoundCounts(
    entries.map((e) => ({
      round_id: e.round_id,
      player_id: Number(e.player_id),
      point_delta: Number(e.point_delta ?? 0),
    })),
  );
  const isEligible = (counts: Map<number, number>, playerId: number) =>
    !ghostPlayerIds.has(playerId) &&
    (counts.get(playerId) ?? 0) > LEADERBOARD_MIN_ROUNDS;

  const eligibleProposed = [...proposedTotals.keys()].filter((id) =>
    isEligible(proposedRoundCounts, id),
  );
  const eligibleStored = [...storedTotals.keys()].filter((id) =>
    isEligible(storedRoundCounts, id),
  );

  // OpenSkill truth for the season: the same parse-and-replay the scorer used
  // for each round's priors, run once over the whole history.
  const ordinals = basketballOrdinalsAfterRounds(
    priorBasketballMatchesFromSeasonHistory(seasonHistory),
  );
  const baseline = baselineBasketballOrdinal();

  const byProposedPoints = [...eligibleProposed].sort(
    (a, b) => (proposedTotals.get(b) ?? 0) - (proposedTotals.get(a) ?? 0),
  );
  const byOrdinal = [...eligibleProposed].sort(
    (a, b) => (ordinals.get(b) ?? baseline) - (ordinals.get(a) ?? baseline),
  );
  const orderingMatches =
    byProposedPoints.length === byOrdinal.length &&
    byProposedPoints.every((id, i) => id === byOrdinal[i]);

  const describe = (id: number) => ({
    playerId: id,
    name: nameById.get(id) ?? String(id),
    proposedPoints: round6(proposedTotals.get(id) ?? 0),
    storedPoints: round6(storedTotals.get(id) ?? 0),
    rounds: proposedRoundCounts.get(id) ?? 0,
    ordinal: round6(ordinals.get(id) ?? baseline),
    /**
     * Points telescope to SCALE * (finalOrdinal - baseline) for a player who
     * only ever appeared in automatic rounds. A nonzero residual means the
     * player also has manual-round points, which the ordinal cannot explain.
     */
    telescopingResidual: round6(
      (proposedTotals.get(id) ?? 0) -
        DEFAULT_BASKETBALL_LEDGER_SCALE *
          ((ordinals.get(id) ?? baseline) - baseline),
    ),
  });

  console.log(
    JSON.stringify(
      {
        seasonId,
        rounds: {
          total: rounds.length,
          autoReplayed: autoRounds,
          manualSkipped: manual,
          unparseableSkipped: unparseable,
          unscorableSkipped: unscorable,
        },
        storedVsProposed: {
          roundsWithEntryMismatch,
          roundsMissingStoredEntry,
          totalAbsDelta: round6(totalAbsDelta),
          maxAbsDelta: round6(maxAbsDelta),
        },
        ghosts: {
          playerIds: [...ghostPlayerIds],
          proposedNonzeroEntries: ghostEntriesProposedNonzero,
          storedNonzeroEntries: ghostEntriesStoredNonzero,
          allProposedExactlyZero: ghostEntriesProposedNonzero === 0,
        },
        balance: {
          everyRoundBalances: roundsNotBalanced === 0,
          roundsNotBalanced,
          unbalancedRoundIds: unbalancedRoundIds.slice(0, 10),
        },
        house: {
          total: round6(houseTotal),
          absTotal: round6(houseAbsTotal),
          meanAbsPerRound: round6(houseAbsTotal / Math.max(1, autoRounds)),
          maxAbs: round6(houseMaxAbs),
          positiveRounds: housePositiveRounds,
          negativeRounds: houseNegativeRounds,
        },
        eligibility: {
          rule: `roundsWon + roundsLost > ${LEADERBOARD_MIN_ROUNDS}, nonzero deltas only, deduped on (round_id, player_id)`,
          eligibleProposed: eligibleProposed.length,
          eligibleStored: eligibleStored.length,
          gainedEligibility: eligibleProposed
            .filter((id) => !eligibleStored.includes(id))
            .map((id) => nameById.get(id) ?? id),
          lostEligibility: eligibleStored
            .filter((id) => !eligibleProposed.includes(id))
            .map((id) => nameById.get(id) ?? id),
        },
        ordering: {
          pointsMatchOpenSkill: orderingMatches,
          byPoints: byProposedPoints.map(describe),
          byOpenSkillOrdinal: byOrdinal.map((id) => nameById.get(id) ?? id),
        },
        worstRoundsByDelta: worstRounds
          .sort((a, b) => b.maxAbsDelta - a.maxAbsDelta)
          .slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
