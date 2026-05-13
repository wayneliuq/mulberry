/**
 * NBA / WNBA pro comparison matching — static pool, no runtime fetches.
 *
 * Curated pool entries live in `nbaComparisonPool.source.json` (prime window + split
 * `statsPrime` vs `narrative` priors). `nbaComparisonPool.build.ts` merges them into
 * the single 8-axis `ComparisonVector` used for distance (stats half: within-pool
 * percentile spread; narrative half: direct [0, 1] priors).
 *
 * Research refresh (Feb 2026): All-Star fan-vote reporting highlighted Luka Dončić
 * and Giannis Antetokounmpo among top vote-getters, with Nikola Jokić, Tyrese Maxey,
 * Jalen Brunson, and Stephen Curry also leading returns; LeBron James was widely
 * noted as missing a starter slot after a long starter streak (NBA.com / Yahoo summaries).
 */

import {
  predictBasketballMatchWinProbabilities,
  type BasketballMatchInput,
} from "../../game-types/basketball";
import type { NbaComparisonRow, NormalizedRound } from "./types";
import {
  CARRY_MIN_SIDE_SAMPLES,
  CLUTCH_MARGIN,
  CLUTCH_MIN_ROUNDS,
  NBA_COMP_ANCHOR_STORAGE_KEY,
  NBA_COMP_HYSTERESIS_TAU,
  NBA_COMP_STICKINESS,
  PAIR_MIN_APART,
  PAIR_MIN_TOGETHER,
  PLAYER_MIN_ROUNDS,
  UPSET_MIN_OPPORTUNITIES,
  UPSET_PROBABILITY_THRESHOLD,
} from "./constants";
import { NBA_COMPARISON_PLAYER_POOL } from "./nbaComparisonPool.build";
import type { ComparisonVector, NbaComparisonPlayer } from "./nbaComparisonVector";

export type { ComparisonVector, NbaComparisonPlayer } from "./nbaComparisonVector";
export { NBA_COMPARISON_PLAYER_POOL };

type WinLoss = { wins: number; losses: number };

const VECTOR_KEYS = [
  "winImpact",
  "carryBias",
  "consistency",
  "clutchDelta",
  "upsetFactor",
  "chemistryBias",
  "personaIntensity",
  "overperformance",
] as const satisfies readonly (keyof ComparisonVector)[];

const DISTANCE_WEIGHTS: Record<keyof ComparisonVector, number> = {
  winImpact: 1.3,
  carryBias: 1.2,
  consistency: 0.95,
  clutchDelta: 1.0,
  upsetFactor: 1.15,
  chemistryBias: 0.9,
  personaIntensity: 0.45,
  overperformance: 1.05,
};

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function entropy(values: number[]): number {
  const sum = values.reduce((acc, current) => acc + current, 0);
  if (sum <= 0) return 0;
  return values.reduce((acc, current) => {
    const p = current / sum;
    return p <= 0 ? acc : acc - p * Math.log2(p);
  }, 0);
}

function keyForPair(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function areTeammates(round: NormalizedRound, a: number, b: number): boolean {
  return (
    (round.teamASet.has(a) && round.teamASet.has(b)) ||
    (round.teamBSet.has(a) && round.teamBSet.has(b))
  );
}

function didPlayerWin(round: NormalizedRound, playerId: number): boolean | null {
  if (round.winnerTeam === "draw") return null;
  if (round.teamASet.has(playerId)) return round.winnerTeam === "A";
  if (round.teamBSet.has(playerId)) return round.winnerTeam === "B";
  return null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function vectorDistance(a: ComparisonVector, b: ComparisonVector): number {
  let sum = 0;
  for (const key of VECTOR_KEYS) {
    const d = a[key] - b[key];
    sum += DISTANCE_WEIGHTS[key] * d * d;
  }
  return Math.sqrt(sum);
}

function fitScoreFromDistance(distance: number): number {
  return 1 / (1 + distance);
}

/** Persisted anchor: vector baseline for hysteresis + current NBA pool id. */
export type NbaCompAnchor = {
  vector: ComparisonVector;
  nbaId: string;
  anchoredAt: number;
};

export type NbaCompAnchorStore = Record<number, NbaCompAnchor>;

export type NbaCompStorageAdapter = {
  load: () => NbaCompAnchorStore | null;
  save: (store: NbaCompAnchorStore) => void;
};

function cloneVector(v: ComparisonVector): ComparisonVector {
  return { ...v };
}

function isComparisonVector(value: unknown): value is ComparisonVector {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  for (const key of VECTOR_KEYS) {
    const n = o[key];
    if (typeof n !== "number" || !Number.isFinite(n)) return false;
  }
  return true;
}

function parseAnchorStore(raw: unknown): NbaCompAnchorStore | null {
  if (!raw || typeof raw !== "object") return null;
  const out: NbaCompAnchorStore = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!v || typeof v !== "object") continue;
    const entry = v as Record<string, unknown>;
    const nbaId = entry.nbaId;
    const anchoredAt = entry.anchoredAt;
    if (typeof nbaId !== "string" || nbaId.length === 0) continue;
    if (typeof anchoredAt !== "number" || !Number.isFinite(anchoredAt)) continue;
    if (!isComparisonVector(entry.vector)) continue;
    out[id] = {
      vector: cloneVector(entry.vector as ComparisonVector),
      nbaId,
      anchoredAt,
    };
  }
  return Object.keys(out).length > 0 ? out : {};
}

export function createLocalStorageNbaCompAdapter(): NbaCompStorageAdapter {
  return {
    load(): NbaCompAnchorStore | null {
      if (typeof globalThis === "undefined") return null;
      const ls = (globalThis as { localStorage?: Storage }).localStorage;
      if (!ls) return null;
      try {
        const raw = ls.getItem(NBA_COMP_ANCHOR_STORAGE_KEY);
        if (raw === null || raw === "") return null;
        const parsed: unknown = JSON.parse(raw);
        return parseAnchorStore(parsed);
      } catch {
        return null;
      }
    },
    save(store: NbaCompAnchorStore): void {
      if (typeof globalThis === "undefined") return;
      const ls = (globalThis as { localStorage?: Storage }).localStorage;
      if (!ls) return;
      try {
        ls.setItem(NBA_COMP_ANCHOR_STORAGE_KEY, JSON.stringify(store));
      } catch {
        // ignore quota / private mode
      }
    },
  };
}

/** In-memory adapter for tests (deterministic, no localStorage). */
export function createMemoryNbaCompStorage(
  initial?: NbaCompAnchorStore | null,
): NbaCompStorageAdapter {
  let store: NbaCompAnchorStore | null =
    initial === undefined ? null : initial === null ? null : { ...initial };
  return {
    load: () => (store === null ? null : { ...store }),
    save: (s: NbaCompAnchorStore) => {
      store = { ...s };
    },
  };
}

const defaultLocalStorageAdapter = createLocalStorageNbaCompAdapter();

type FriendRaw = {
  playerId: number;
  displayName: string;
  roundsPlayed: number;
  winRate: number;
  clutchDelta: number | null;
  clutchSampleSize: number;
  carryBias: number | null;
  carrySampleSize: number;
  volatility: number;
  upsetRate: number | null;
  upsetOpportunities: number;
  maxComboLift: number | null;
  teammateEntropy: number;
  overperformance: number | null;
  overperformanceSampleSize: number;
};

function computeRoundCountByPlayer(rounds: NormalizedRound[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const round of rounds) {
    for (const playerId of round.participants) {
      counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    }
  }
  return counts;
}

function computeOverallRankByPoints(rounds: NormalizedRound[]): Map<number, number> {
  const pointsByPlayer = new Map<number, number>();
  for (const round of rounds) {
    for (const [playerId, delta] of round.entryPointDeltaByPlayerId.entries()) {
      pointsByPlayer.set(playerId, (pointsByPlayer.get(playerId) ?? 0) + delta);
    }
  }
  const sorted = Array.from(pointsByPlayer.entries()).sort((a, b) => b[1] - a[1]);
  const rankByPlayer = new Map<number, number>();
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]![1] !== sorted[i - 1]![1]) {
      rank = i + 1;
    }
    rankByPlayer.set(sorted[i]![0], rank);
  }
  return rankByPlayer;
}

function gatherFriendRawStats(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
): Map<number, FriendRaw> {
  const rankByPlayerId = computeOverallRankByPoints(rounds);
  const overall = new Map<number, WinLoss>();
  const close = new Map<number, WinLoss>();
  const lower = new Map<number, WinLoss>();
  const higher = new Map<number, WinLoss>();
  const deltasByPlayer = new Map<number, number[]>();
  const opportunities = new Map<number, WinLoss>();
  const teammateCounts = new Map<number, Map<number, number>>();
  const overperformanceSum = new Map<number, number>();
  const overperformanceCount = new Map<number, number>();
  const priors: BasketballMatchInput[] = [];

  for (const round of rounds) {
    for (const playerId of round.participants) {
      const win = didPlayerWin(round, playerId);
      if (win === null) continue;
      const o = overall.get(playerId) ?? { wins: 0, losses: 0 };
      if (win) o.wins += 1;
      else o.losses += 1;
      overall.set(playerId, o);
      if (round.scoreMargin <= CLUTCH_MARGIN) {
        const c = close.get(playerId) ?? { wins: 0, losses: 0 };
        if (win) c.wins += 1;
        else c.losses += 1;
        close.set(playerId, c);
      }

      const teammatesLineup = round.teamASet.has(playerId)
        ? round.teamAPlayerIds.filter((id) => id !== playerId)
        : round.teamBPlayerIds.filter((id) => id !== playerId);

      const myRank = rankByPlayerId.get(playerId);
      if (myRank) {
        for (const teammateId of teammatesLineup) {
          const teammateRank = rankByPlayerId.get(teammateId);
          if (!teammateRank) continue;
          if (teammateRank > myRank) {
            const bucket = lower.get(playerId) ?? { wins: 0, losses: 0 };
            if (win) bucket.wins += 1;
            else bucket.losses += 1;
            lower.set(playerId, bucket);
          } else if (teammateRank < myRank) {
            const bucket = higher.get(playerId) ?? { wins: 0, losses: 0 };
            if (win) bucket.wins += 1;
            else bucket.losses += 1;
            higher.set(playerId, bucket);
          }
        }
      }

      const counts = teammateCounts.get(playerId) ?? new Map<number, number>();
      for (const teammateId of teammatesLineup) {
        counts.set(teammateId, (counts.get(teammateId) ?? 0) + 1);
      }
      teammateCounts.set(playerId, counts);
    }

    for (const [playerId, delta] of round.entryPointDeltaByPlayerId.entries()) {
      const list = deltasByPlayer.get(playerId) ?? [];
      list.push(delta);
      deltasByPlayer.set(playerId, list);
    }

    const match: BasketballMatchInput = {
      teamAPlayerIds: round.teamAPlayerIds,
      teamBPlayerIds: round.teamBPlayerIds,
      scoreTeamA: round.scoreTeamA,
      scoreTeamB: round.scoreTeamB,
    };
    priors.push(match);
    const probs = predictBasketballMatchWinProbabilities(priors, match);
    if (probs && round.winnerTeam !== "draw") {
      for (const playerId of round.participants) {
        const onTeamA = round.teamASet.has(playerId);
        const skillWinProb = onTeamA ? probs.teamAWinProb : probs.teamBWinProb;
        const w = didPlayerWin(round, playerId);
        if (w !== null) {
          overperformanceSum.set(
            playerId,
            (overperformanceSum.get(playerId) ?? 0) + ((w ? 1 : 0) - skillWinProb),
          );
          overperformanceCount.set(
            playerId,
            (overperformanceCount.get(playerId) ?? 0) + 1,
          );
        }
        if (skillWinProb < UPSET_PROBABILITY_THRESHOLD) {
          const wl = opportunities.get(playerId) ?? { wins: 0, losses: 0 };
          if (w === true) wl.wins += 1;
          else if (w === false) wl.losses += 1;
          opportunities.set(playerId, wl);
        }
      }
    }
  }

  const eligiblePlayerIds = Array.from(roundCountByPlayer.entries())
    .filter(([, n]) => n >= PLAYER_MIN_ROUNDS)
    .map(([id]) => id)
    .sort((a, b) => a - b);

  const maxComboLiftByPlayer = new Map<number, number>();
  const pairs = new Map<
    string,
    {
      a: number;
      b: number;
      together: WinLoss;
      apartA: WinLoss;
      apartB: WinLoss;
    }
  >();

  for (let i = 0; i < eligiblePlayerIds.length; i++) {
    for (let j = i + 1; j < eligiblePlayerIds.length; j++) {
      const a = eligiblePlayerIds[i]!;
      const b = eligiblePlayerIds[j]!;
      pairs.set(keyForPair(a, b), {
        a,
        b,
        together: { wins: 0, losses: 0 },
        apartA: { wins: 0, losses: 0 },
        apartB: { wins: 0, losses: 0 },
      });
    }
  }

  for (const round of rounds) {
    for (const pair of pairs.values()) {
      const aPresent = round.teamASet.has(pair.a) || round.teamBSet.has(pair.a);
      const bPresent = round.teamASet.has(pair.b) || round.teamBSet.has(pair.b);
      const sameTeam = aPresent && bPresent && areTeammates(round, pair.a, pair.b);

      if (sameTeam) {
        const togetherWin = didPlayerWin(round, pair.a);
        if (togetherWin === null) continue;
        if (togetherWin) pair.together.wins += 1;
        else pair.together.losses += 1;
        continue;
      }

      if (aPresent) {
        const aWin = didPlayerWin(round, pair.a);
        if (aWin !== null) {
          if (aWin) pair.apartA.wins += 1;
          else pair.apartA.losses += 1;
        }
      }
      if (bPresent) {
        const bWin = didPlayerWin(round, pair.b);
        if (bWin !== null) {
          if (bWin) pair.apartB.wins += 1;
          else pair.apartB.losses += 1;
        }
      }
    }
  }

  for (const pair of pairs.values()) {
    const togetherGames = pair.together.wins + pair.together.losses;
    const apartAGames = pair.apartA.wins + pair.apartA.losses;
    const apartBGames = pair.apartB.wins + pair.apartB.losses;
    if (togetherGames < PAIR_MIN_TOGETHER || apartAGames < PAIR_MIN_APART || apartBGames < PAIR_MIN_APART) {
      continue;
    }
    const togetherRate = pair.together.wins / togetherGames;
    const apartARate = pair.apartA.wins / apartAGames;
    const apartBRate = pair.apartB.wins / apartBGames;
    const apartRate = (apartARate + apartBRate) / 2;
    const lift = togetherRate - apartRate;
    const prevA = maxComboLiftByPlayer.get(pair.a);
    maxComboLiftByPlayer.set(pair.a, prevA === undefined ? lift : Math.max(prevA, lift));
    const prevB = maxComboLiftByPlayer.get(pair.b);
    maxComboLiftByPlayer.set(pair.b, prevB === undefined ? lift : Math.max(prevB, lift));
  }

  const out = new Map<number, FriendRaw>();
  for (const playerId of eligiblePlayerIds) {
    const roundsPlayed = roundCountByPlayer.get(playerId) ?? 0;
    const o = overall.get(playerId) ?? { wins: 0, losses: 0 };
    const total = o.wins + o.losses;
    const winRate = total > 0 ? o.wins / total : 0.5;

    const c = close.get(playerId) ?? { wins: 0, losses: 0 };
    const closeGames = c.wins + c.losses;
    let clutchDelta: number | null = null;
    if (closeGames > 0 && total > 0) {
      const overallRate = o.wins / total;
      const closeRate = c.wins / closeGames;
      clutchDelta = closeRate - overallRate;
    }

    const lowerWL = lower.get(playerId) ?? { wins: 0, losses: 0 };
    const higherWL = higher.get(playerId) ?? { wins: 0, losses: 0 };
    const lowerGames = lowerWL.wins + lowerWL.losses;
    const higherGames = higherWL.wins + higherWL.losses;
    let carryBias: number | null = null;
    if (lowerGames > 0 && higherGames > 0) {
      carryBias = lowerWL.wins / lowerGames - higherWL.wins / higherGames;
    }
    const carrySampleSize = Math.min(lowerGames, higherGames);

    const deltas = deltasByPlayer.get(playerId) ?? [];
    const volatility = stdev(deltas.length > 0 ? deltas : [0]);

    const opp = opportunities.get(playerId) ?? { wins: 0, losses: 0 };
    const oppTotal = opp.wins + opp.losses;
    const upsetRate: number | null = oppTotal > 0 ? opp.wins / oppTotal : null;

    const counts = teammateCounts.get(playerId) ?? new Map<number, number>();
    const teammateEntropy = entropy(Array.from(counts.values()));

    const overCount = overperformanceCount.get(playerId) ?? 0;
    const overSum = overperformanceSum.get(playerId) ?? 0;
    const overperformance = overCount > 0 ? overSum / overCount : null;

    out.set(playerId, {
      playerId,
      displayName: playerNameById.get(playerId) ?? String(playerId),
      roundsPlayed,
      winRate,
      clutchDelta,
      clutchSampleSize: closeGames,
      carryBias,
      carrySampleSize,
      volatility,
      upsetRate,
      upsetOpportunities: oppTotal,
      maxComboLift: maxComboLiftByPlayer.has(playerId) ? maxComboLiftByPlayer.get(playerId)! : null,
      teammateEntropy,
      overperformance,
      overperformanceSampleSize: overCount,
    });
  }
  return out;
}

function shrinkTowardNeutral(scaled: number, n: number, threshold: number): number {
  if (n <= 0) return 0.5;
  const w = Math.min(1, n / threshold);
  return clamp01(w * scaled + (1 - w) * 0.5);
}

function rawToComparisonVector(
  raw: FriendRaw,
  cohort: {
    volatilityMax: number;
    entropyMax: number;
  },
): ComparisonVector {
  const winImpact = clamp01(raw.winRate);

  const carryScaled = raw.carryBias === null ? 0.5 : clamp01((raw.carryBias + 1) / 2);
  const carryBias = shrinkTowardNeutral(
    carryScaled,
    raw.carrySampleSize,
    CARRY_MIN_SIDE_SAMPLES,
  );

  const volMax = cohort.volatilityMax || 1;
  const consistency = clamp01(1 - raw.volatility / volMax);

  const clutchScaled =
    raw.clutchDelta === null ? 0.5 : clamp01((raw.clutchDelta + 0.35) / 0.7);
  const clutchDelta = shrinkTowardNeutral(
    clutchScaled,
    raw.clutchSampleSize,
    CLUTCH_MIN_ROUNDS,
  );

  const upsetScaled = raw.upsetRate === null ? 0.5 : clamp01(raw.upsetRate);
  const upsetFactor = shrinkTowardNeutral(
    upsetScaled,
    raw.upsetOpportunities,
    UPSET_MIN_OPPORTUNITIES,
  );

  const entMax = cohort.entropyMax || 1;
  const chemistryBias = clamp01(raw.teammateEntropy / entMax);
  const lift = raw.maxComboLift === null ? 0 : clamp01((raw.maxComboLift + 0.35) / 0.7);
  const chemBlend = clamp01(chemistryBias * 0.55 + lift * 0.45);

  const upsetIntensity = raw.upsetRate === null ? 0.35 : clamp01(raw.upsetRate);
  const volNorm = clamp01(raw.volatility / volMax);
  const carryExtreme = raw.carryBias === null ? 0.4 : clamp01(Math.abs(raw.carryBias) * 2);
  const clutchExtreme =
    raw.clutchDelta === null ? 0.35 : clamp01(Math.min(1, Math.abs(raw.clutchDelta) * 4));
  const personaIntensity = clamp01(
    upsetIntensity * 0.35 + volNorm * 0.25 + carryExtreme * 0.2 + clutchExtreme * 0.2,
  );

  // Overperformance: mean of (actual_win − model_pre_round_win_prob) across decisive rounds.
  // Practical range ~[-0.25, +0.25]; map linearly so 0 → 0.5.
  const overperformance =
    raw.overperformance === null
      ? 0.5
      : clamp01((raw.overperformance + 0.25) / 0.5);

  return {
    winImpact,
    carryBias,
    consistency,
    clutchDelta,
    upsetFactor,
    chemistryBias: chemBlend,
    personaIntensity,
    overperformance,
  };
}

function assignUniqueGreedy(
  friendIds: number[],
  friendVectors: Map<number, ComparisonVector>,
  pool: NbaComparisonPlayer[],
  stickyNbaIdByPlayerId: Map<number, string> | undefined,
  stickiness: number,
): Array<{ playerId: number; nba: NbaComparisonPlayer; distance: number }> {
  type Edge = { playerId: number; nbaId: string; distance: number };
  const sticky = stickyNbaIdByPlayerId ?? new Map<number, string>();
  const edges: Edge[] = [];
  for (const playerId of friendIds) {
    const fv = friendVectors.get(playerId);
    if (!fv) continue;
    const stickyId = sticky.get(playerId);
    for (const nba of pool) {
      let distance = vectorDistance(fv, nba.vector);
      if (stickyId !== undefined && stickyId === nba.id) {
        distance *= 1 - stickiness;
      }
      edges.push({
        playerId,
        nbaId: nba.id,
        distance,
      });
    }
  }
  edges.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.playerId !== b.playerId) return a.playerId - b.playerId;
    return a.nbaId.localeCompare(b.nbaId);
  });

  const assignedFriend = new Set<number>();
  const assignedNba = new Set<string>();
  const matches: Array<{ playerId: number; nba: NbaComparisonPlayer; distance: number }> = [];
  const poolById = new Map(pool.map((p) => [p.id, p]));

  for (const e of edges) {
    if (assignedFriend.has(e.playerId) || assignedNba.has(e.nbaId)) continue;
    const nba = poolById.get(e.nbaId);
    if (!nba) continue;
    assignedFriend.add(e.playerId);
    assignedNba.add(e.nbaId);
    matches.push({ playerId: e.playerId, nba, distance: e.distance });
  }
  matches.sort((a, b) => a.playerId - b.playerId);
  return matches;
}

export type ComputeNbaComparisonRowsOptions = {
  storage?: NbaCompStorageAdapter;
  hysteresisTau?: number;
  /** Distance multiplier for sticky rematch edges; default from constants. */
  stickiness?: number;
};

export function computeNbaComparisonRows(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  options?: ComputeNbaComparisonRowsOptions,
): NbaComparisonRow[] {
  const storage = options?.storage ?? defaultLocalStorageAdapter;
  const tau = options?.hysteresisTau ?? NBA_COMP_HYSTERESIS_TAU;
  const stickiness = options?.stickiness ?? NBA_COMP_STICKINESS;

  const roundCountByPlayer = computeRoundCountByPlayer(rounds);
  const rawMap = gatherFriendRawStats(rounds, playerNameById, roundCountByPlayer);
  if (rawMap.size === 0) {
    storage.save({});
    return [];
  }

  const volatilities = Array.from(rawMap.values()).map((r) => r.volatility);
  const entropies = Array.from(rawMap.values()).map((r) => r.teammateEntropy);
  const cohort = {
    volatilityMax: Math.max(...volatilities, 1e-6),
    entropyMax: Math.max(...entropies, 1e-6),
  };

  const friendVectors = new Map<number, ComparisonVector>();
  for (const [id, raw] of rawMap.entries()) {
    friendVectors.set(id, rawToComparisonVector(raw, cohort));
  }

  const friendIds = Array.from(rawMap.keys()).sort((a, b) => a - b);
  const poolById = new Map(NBA_COMPARISON_PLAYER_POOL.map((p) => [p.id, p]));

  const loaded = storage.load();
  const anchors: NbaCompAnchorStore =
    loaded && typeof loaded === "object" ? loaded : {};

  const lockedMatches = new Map<number, { nba: NbaComparisonPlayer; distance: number }>();
  const greedyFriendIds: number[] = [];
  const stickyNbaIdByPlayerId = new Map<number, string>();
  const lockedNbaIds = new Set<string>();

  for (const id of friendIds) {
    const fresh = friendVectors.get(id);
    if (!fresh) continue;
    const anchor = anchors[id];

    if (!anchor || !poolById.has(anchor.nbaId)) {
      greedyFriendIds.push(id);
      continue;
    }

    const drift = vectorDistance(fresh, anchor.vector);
    const wantsLock = drift <= tau;
    const nbaIdFree = !lockedNbaIds.has(anchor.nbaId);

    if (wantsLock && nbaIdFree) {
      const nba = poolById.get(anchor.nbaId)!;
      lockedNbaIds.add(anchor.nbaId);
      lockedMatches.set(id, {
        nba,
        distance: vectorDistance(fresh, nba.vector),
      });
    } else {
      greedyFriendIds.push(id);
      stickyNbaIdByPlayerId.set(id, anchor.nbaId);
    }
  }

  const takenNbaIds = new Set<string>();
  for (const m of lockedMatches.values()) {
    takenNbaIds.add(m.nba.id);
  }

  const greedyPool = NBA_COMPARISON_PLAYER_POOL.filter((p) => !takenNbaIds.has(p.id));
  const greedyMatches = assignUniqueGreedy(
    [...greedyFriendIds].sort((a, b) => a - b),
    friendVectors,
    greedyPool,
    stickyNbaIdByPlayerId,
    stickiness,
  );

  const matchByPlayer = new Map<number, { nba: NbaComparisonPlayer; distance: number }>();
  for (const [id, m] of lockedMatches) matchByPlayer.set(id, m);
  for (const m of greedyMatches) matchByPlayer.set(m.playerId, m);

  const nextStore: NbaCompAnchorStore = {};
  const rows: NbaComparisonRow[] = [];

  for (const id of friendIds) {
    const m = matchByPlayer.get(id);
    if (!m) continue;

    const playerName = playerNameById.get(id) ?? String(id);
    const fit = fitScoreFromDistance(m.distance);
    const old = anchors[id];

    const row: NbaComparisonRow = {
      playerName,
      nbaMatchName: m.nba.displayName,
      fitScore: fit,
    };

    if (!lockedMatches.has(id) && old && poolById.has(old.nbaId) && old.nbaId !== m.nba.id) {
      row.previousMatchName = poolById.get(old.nbaId)!.displayName;
    }

    rows.push(row);

    const fresh = friendVectors.get(id)!;
    if (lockedMatches.has(id) && anchors[id]) {
      nextStore[id] = {
        vector: cloneVector(anchors[id]!.vector),
        nbaId: anchors[id]!.nbaId,
        anchoredAt: anchors[id]!.anchoredAt,
      };
    } else {
      nextStore[id] = {
        vector: cloneVector(fresh),
        nbaId: m.nba.id,
        anchoredAt: old?.nbaId === m.nba.id ? old.anchoredAt : Date.now(),
      };
    }
  }

  storage.save(nextStore);

  rows.sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    return a.playerName.localeCompare(b.playerName);
  });
  return rows;
}
