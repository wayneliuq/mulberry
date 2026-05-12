/**
 * NBA player comparison pool — static, build-time curated (no runtime fetches).
 *
 * Research refresh (Feb 2026): public All-Star starter / fan-vote reporting
 * highlights Luka Dončić and Giannis Antetokounmpo among top vote-getters, with
 * Nikola Jokić, Tyrese Maxey, Jalen Brunson, and Stephen Curry also leading
 * fan returns; LeBron James was widely noted as missing a starter slot after
 * a long starter streak (NBA.com communications / Yahoo Sports summaries).
 *
 * Pool skew: mostly LeBron era (2003+) through today’s stars, fewer distant
 * pre-2000s names; includes Yao Ming as requested. Vectors are coarse fun priors.
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
  PAIR_MIN_APART,
  PAIR_MIN_TOGETHER,
  PLAYER_MIN_ROUNDS,
  UPSET_MIN_OPPORTUNITIES,
  UPSET_PROBABILITY_THRESHOLD,
} from "./constants";

export type ComparisonVector = {
  winImpact: number;
  carryBias: number;
  consistency: number;
  clutchDelta: number;
  upsetFactor: number;
  chemistryBias: number;
  personaIntensity: number;
};

export type NbaComparisonPlayer = {
  id: string;
  displayName: string;
  vector: ComparisonVector;
};

type WinLoss = { wins: number; losses: number };

const VECTOR_KEYS = [
  "winImpact",
  "carryBias",
  "consistency",
  "clutchDelta",
  "upsetFactor",
  "chemistryBias",
  "personaIntensity",
] as const satisfies readonly (keyof ComparisonVector)[];

const DISTANCE_WEIGHTS: Record<keyof ComparisonVector, number> = {
  winImpact: 1.15,
  carryBias: 1.05,
  consistency: 0.95,
  clutchDelta: 0.85,
  upsetFactor: 1.0,
  chemistryBias: 0.9,
  personaIntensity: 0.55,
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

type FriendRaw = {
  playerId: number;
  displayName: string;
  roundsPlayed: number;
  winRate: number;
  clutchDelta: number | null;
  carryBias: number | null;
  volatility: number;
  upsetRate: number | null;
  upsetOpportunities: number;
  maxComboLift: number | null;
  teammateEntropy: number;
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
        if (skillWinProb < UPSET_PROBABILITY_THRESHOLD) {
          const wl = opportunities.get(playerId) ?? { wins: 0, losses: 0 };
          const w = didPlayerWin(round, playerId);
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
    if (closeGames >= CLUTCH_MIN_ROUNDS && total > 0) {
      const overallRate = o.wins / total;
      const closeRate = c.wins / closeGames;
      clutchDelta = closeRate - overallRate;
    }

    const lowerWL = lower.get(playerId) ?? { wins: 0, losses: 0 };
    const higherWL = higher.get(playerId) ?? { wins: 0, losses: 0 };
    const lowerGames = lowerWL.wins + lowerWL.losses;
    const higherGames = higherWL.wins + higherWL.losses;
    let carryBias: number | null = null;
    if (
      roundsPlayed >= PLAYER_MIN_ROUNDS &&
      lowerGames >= CARRY_MIN_SIDE_SAMPLES &&
      higherGames >= CARRY_MIN_SIDE_SAMPLES
    ) {
      carryBias = lowerWL.wins / lowerGames - higherWL.wins / higherGames;
    }

    const deltas = deltasByPlayer.get(playerId) ?? [];
    const volatility = stdev(deltas.length > 0 ? deltas : [0]);

    const opp = opportunities.get(playerId) ?? { wins: 0, losses: 0 };
    const oppTotal = opp.wins + opp.losses;
    let upsetRate: number | null = null;
    if (oppTotal >= UPSET_MIN_OPPORTUNITIES) {
      upsetRate = opp.wins / oppTotal;
    }

    const counts = teammateCounts.get(playerId) ?? new Map<number, number>();
    const teammateEntropy = entropy(Array.from(counts.values()));

    out.set(playerId, {
      playerId,
      displayName: playerNameById.get(playerId) ?? String(playerId),
      roundsPlayed,
      winRate,
      clutchDelta,
      carryBias,
      volatility,
      upsetRate,
      upsetOpportunities: oppTotal,
      maxComboLift: maxComboLiftByPlayer.has(playerId) ? maxComboLiftByPlayer.get(playerId)! : null,
      teammateEntropy,
    });
  }
  return out;
}

function rawToComparisonVector(
  raw: FriendRaw,
  cohort: {
    volatilityMax: number;
    entropyMax: number;
  },
): ComparisonVector {
  const winImpact = clamp01(raw.winRate);
  const carryBias = raw.carryBias === null ? 0.5 : clamp01((raw.carryBias + 1) / 2);
  const volMax = cohort.volatilityMax || 1;
  const consistency = clamp01(1 - raw.volatility / volMax);
  const clutchDelta = raw.clutchDelta === null ? 0.5 : clamp01((raw.clutchDelta + 0.35) / 0.7);
  const upsetFactor = raw.upsetRate === null ? 0.5 : clamp01(raw.upsetRate);
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
  return {
    winImpact,
    carryBias,
    consistency,
    clutchDelta,
    upsetFactor,
    chemistryBias: chemBlend,
    personaIntensity,
  };
}

function assignUniqueGreedy(
  friendIds: number[],
  friendVectors: Map<number, ComparisonVector>,
  pool: NbaComparisonPlayer[],
): Array<{ playerId: number; nba: NbaComparisonPlayer; distance: number }> {
  type Edge = { playerId: number; nbaId: string; distance: number };
  const edges: Edge[] = [];
  for (const playerId of friendIds) {
    const fv = friendVectors.get(playerId);
    if (!fv) continue;
    for (const nba of pool) {
      edges.push({
        playerId,
        nbaId: nba.id,
        distance: vectorDistance(fv, nba.vector),
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

export const NBA_COMPARISON_PLAYER_POOL: NbaComparisonPlayer[] = [
  // ~LeBron era (2003+) through 2026; Yao Ming included; pre-LeBron legends omitted.
  {
    id: "yao",
    displayName: "Yao Ming",
    vector: {
      winImpact: 0.82,
      carryBias: 0.58,
      consistency: 0.8,
      clutchDelta: 0.72,
      upsetFactor: 0.52,
      chemistryBias: 0.78,
      personaIntensity: 0.35,
    },
  },
  {
    id: "lebron",
    displayName: "LeBron James",
    vector: {
      winImpact: 0.9,
      carryBias: 0.78,
      consistency: 0.88,
      clutchDelta: 0.8,
      upsetFactor: 0.58,
      chemistryBias: 0.88,
      personaIntensity: 0.55,
    },
  },
  {
    id: "wade",
    displayName: "Dwyane Wade",
    vector: {
      winImpact: 0.86,
      carryBias: 0.74,
      consistency: 0.82,
      clutchDelta: 0.84,
      upsetFactor: 0.56,
      chemistryBias: 0.7,
      personaIntensity: 0.48,
    },
  },
  {
    id: "melo",
    displayName: "Carmelo Anthony",
    vector: {
      winImpact: 0.8,
      carryBias: 0.72,
      consistency: 0.76,
      clutchDelta: 0.82,
      upsetFactor: 0.5,
      chemistryBias: 0.58,
      personaIntensity: 0.42,
    },
  },
  {
    id: "durant",
    displayName: "Kevin Durant",
    vector: {
      winImpact: 0.9,
      carryBias: 0.85,
      consistency: 0.87,
      clutchDelta: 0.84,
      upsetFactor: 0.54,
      chemistryBias: 0.62,
      personaIntensity: 0.46,
    },
  },
  {
    id: "curry",
    displayName: "Stephen Curry",
    vector: {
      winImpact: 0.88,
      carryBias: 0.72,
      consistency: 0.85,
      clutchDelta: 0.92,
      upsetFactor: 0.6,
      chemistryBias: 0.7,
      personaIntensity: 0.42,
    },
  },
  {
    id: "harden",
    displayName: "James Harden",
    vector: {
      winImpact: 0.84,
      carryBias: 0.8,
      consistency: 0.78,
      clutchDelta: 0.74,
      upsetFactor: 0.55,
      chemistryBias: 0.72,
      personaIntensity: 0.58,
    },
  },
  {
    id: "westbrook",
    displayName: "Russell Westbrook",
    vector: {
      winImpact: 0.76,
      carryBias: 0.82,
      consistency: 0.62,
      clutchDelta: 0.72,
      upsetFactor: 0.56,
      chemistryBias: 0.6,
      personaIntensity: 0.85,
    },
  },
  {
    id: "cp3",
    displayName: "Chris Paul",
    vector: {
      winImpact: 0.82,
      carryBias: 0.65,
      consistency: 0.9,
      clutchDelta: 0.8,
      upsetFactor: 0.54,
      chemistryBias: 0.92,
      personaIntensity: 0.62,
    },
  },
  {
    id: "kawhi",
    displayName: "Kawhi Leonard",
    vector: {
      winImpact: 0.86,
      carryBias: 0.7,
      consistency: 0.9,
      clutchDelta: 0.88,
      upsetFactor: 0.52,
      chemistryBias: 0.58,
      personaIntensity: 0.32,
    },
  },
  {
    id: "george",
    displayName: "Paul George",
    vector: {
      winImpact: 0.8,
      carryBias: 0.68,
      consistency: 0.8,
      clutchDelta: 0.78,
      upsetFactor: 0.53,
      chemistryBias: 0.6,
      personaIntensity: 0.44,
    },
  },
  {
    id: "davis",
    displayName: "Anthony Davis",
    vector: {
      winImpact: 0.82,
      carryBias: 0.65,
      consistency: 0.72,
      clutchDelta: 0.7,
      upsetFactor: 0.54,
      chemistryBias: 0.64,
      personaIntensity: 0.42,
    },
  },
  {
    id: "kyrie",
    displayName: "Kyrie Irving",
    vector: {
      winImpact: 0.8,
      carryBias: 0.7,
      consistency: 0.78,
      clutchDelta: 0.86,
      upsetFactor: 0.55,
      chemistryBias: 0.58,
      personaIntensity: 0.52,
    },
  },
  {
    id: "giannis",
    displayName: "Giannis Antetokounmpo",
    vector: {
      winImpact: 0.9,
      carryBias: 0.82,
      consistency: 0.8,
      clutchDelta: 0.68,
      upsetFactor: 0.58,
      chemistryBias: 0.62,
      personaIntensity: 0.52,
    },
  },
  {
    id: "jokic",
    displayName: "Nikola Jokić",
    vector: {
      winImpact: 0.93,
      carryBias: 0.75,
      consistency: 0.9,
      clutchDelta: 0.75,
      upsetFactor: 0.55,
      chemistryBias: 0.95,
      personaIntensity: 0.35,
    },
  },
  {
    id: "embiid",
    displayName: "Joel Embiid",
    vector: {
      winImpact: 0.84,
      carryBias: 0.72,
      consistency: 0.7,
      clutchDelta: 0.72,
      upsetFactor: 0.48,
      chemistryBias: 0.55,
      personaIntensity: 0.55,
    },
  },
  {
    id: "luka",
    displayName: "Luka Dončić",
    vector: {
      winImpact: 0.92,
      carryBias: 0.88,
      consistency: 0.78,
      clutchDelta: 0.82,
      upsetFactor: 0.62,
      chemistryBias: 0.55,
      personaIntensity: 0.45,
    },
  },
  {
    id: "sga",
    displayName: "Shai Gilgeous-Alexander",
    vector: {
      winImpact: 0.89,
      carryBias: 0.8,
      consistency: 0.86,
      clutchDelta: 0.8,
      upsetFactor: 0.52,
      chemistryBias: 0.58,
      personaIntensity: 0.38,
    },
  },
  {
    id: "tatum",
    displayName: "Jayson Tatum",
    vector: {
      winImpact: 0.85,
      carryBias: 0.7,
      consistency: 0.8,
      clutchDelta: 0.76,
      upsetFactor: 0.53,
      chemistryBias: 0.65,
      personaIntensity: 0.4,
    },
  },
  {
    id: "booker",
    displayName: "Devin Booker",
    vector: {
      winImpact: 0.82,
      carryBias: 0.68,
      consistency: 0.78,
      clutchDelta: 0.86,
      upsetFactor: 0.5,
      chemistryBias: 0.6,
      personaIntensity: 0.44,
    },
  },
  {
    id: "dame",
    displayName: "Damian Lillard",
    vector: {
      winImpact: 0.83,
      carryBias: 0.76,
      consistency: 0.8,
      clutchDelta: 0.9,
      upsetFactor: 0.57,
      chemistryBias: 0.62,
      personaIntensity: 0.46,
    },
  },
  {
    id: "mitchell",
    displayName: "Donovan Mitchell",
    vector: {
      winImpact: 0.84,
      carryBias: 0.74,
      consistency: 0.74,
      clutchDelta: 0.85,
      upsetFactor: 0.56,
      chemistryBias: 0.58,
      personaIntensity: 0.48,
    },
  },
  {
    id: "jimmy",
    displayName: "Jimmy Butler",
    vector: {
      winImpact: 0.82,
      carryBias: 0.78,
      consistency: 0.8,
      clutchDelta: 0.82,
      upsetFactor: 0.62,
      chemistryBias: 0.68,
      personaIntensity: 0.72,
    },
  },
  {
    id: "draymond",
    displayName: "Draymond Green",
    vector: {
      winImpact: 0.78,
      carryBias: 0.62,
      consistency: 0.72,
      clutchDelta: 0.68,
      upsetFactor: 0.58,
      chemistryBias: 0.88,
      personaIntensity: 0.92,
    },
  },
  {
    id: "dillon",
    displayName: "Dillon Brooks",
    vector: {
      winImpact: 0.7,
      carryBias: 0.58,
      consistency: 0.68,
      clutchDelta: 0.65,
      upsetFactor: 0.55,
      chemistryBias: 0.55,
      personaIntensity: 0.9,
    },
  },
  {
    id: "ja",
    displayName: "Ja Morant",
    vector: {
      winImpact: 0.78,
      carryBias: 0.76,
      consistency: 0.62,
      clutchDelta: 0.78,
      upsetFactor: 0.55,
      chemistryBias: 0.52,
      personaIntensity: 0.72,
    },
  },
  {
    id: "trae",
    displayName: "Trae Young",
    vector: {
      winImpact: 0.76,
      carryBias: 0.74,
      consistency: 0.68,
      clutchDelta: 0.82,
      upsetFactor: 0.52,
      chemistryBias: 0.58,
      personaIntensity: 0.5,
    },
  },
  {
    id: "zion",
    displayName: "Zion Williamson",
    vector: {
      winImpact: 0.76,
      carryBias: 0.75,
      consistency: 0.62,
      clutchDelta: 0.68,
      upsetFactor: 0.54,
      chemistryBias: 0.58,
      personaIntensity: 0.48,
    },
  },
  {
    id: "ant",
    displayName: "Anthony Edwards",
    vector: {
      winImpact: 0.83,
      carryBias: 0.72,
      consistency: 0.7,
      clutchDelta: 0.74,
      upsetFactor: 0.57,
      chemistryBias: 0.55,
      personaIntensity: 0.58,
    },
  },
  {
    id: "wemby",
    displayName: "Victor Wembanyama",
    vector: {
      winImpact: 0.78,
      carryBias: 0.7,
      consistency: 0.65,
      clutchDelta: 0.72,
      upsetFactor: 0.58,
      chemistryBias: 0.6,
      personaIntensity: 0.4,
    },
  },
  {
    id: "brunson",
    displayName: "Jalen Brunson",
    vector: {
      winImpact: 0.82,
      carryBias: 0.68,
      consistency: 0.82,
      clutchDelta: 0.88,
      upsetFactor: 0.55,
      chemistryBias: 0.72,
      personaIntensity: 0.36,
    },
  },
  {
    id: "maxey",
    displayName: "Tyrese Maxey",
    vector: {
      winImpact: 0.8,
      carryBias: 0.65,
      consistency: 0.8,
      clutchDelta: 0.78,
      upsetFactor: 0.52,
      chemistryBias: 0.62,
      personaIntensity: 0.34,
    },
  },
  {
    id: "cade",
    displayName: "Cade Cunningham",
    vector: {
      winImpact: 0.76,
      carryBias: 0.62,
      consistency: 0.72,
      clutchDelta: 0.7,
      upsetFactor: 0.5,
      chemistryBias: 0.68,
      personaIntensity: 0.4,
    },
  },
  {
    id: "banchero",
    displayName: "Paolo Banchero",
    vector: {
      winImpact: 0.74,
      carryBias: 0.68,
      consistency: 0.7,
      clutchDelta: 0.72,
      upsetFactor: 0.5,
      chemistryBias: 0.6,
      personaIntensity: 0.42,
    },
  },
  {
    id: "flagg",
    displayName: "Cooper Flagg",
    vector: {
      winImpact: 0.68,
      carryBias: 0.58,
      consistency: 0.66,
      clutchDelta: 0.65,
      upsetFactor: 0.52,
      chemistryBias: 0.62,
      personaIntensity: 0.38,
    },
  },
  {
    id: "klay",
    displayName: "Klay Thompson",
    vector: {
      winImpact: 0.78,
      carryBias: 0.55,
      consistency: 0.82,
      clutchDelta: 0.8,
      upsetFactor: 0.52,
      chemistryBias: 0.65,
      personaIntensity: 0.36,
    },
  },
  {
    id: "bam",
    displayName: "Bam Adebayo",
    vector: {
      winImpact: 0.78,
      carryBias: 0.6,
      consistency: 0.82,
      clutchDelta: 0.7,
      upsetFactor: 0.54,
      chemistryBias: 0.8,
      personaIntensity: 0.45,
    },
  },
  {
    id: "sabonis",
    displayName: "Domantas Sabonis",
    vector: {
      winImpact: 0.8,
      carryBias: 0.64,
      consistency: 0.84,
      clutchDelta: 0.72,
      upsetFactor: 0.5,
      chemistryBias: 0.88,
      personaIntensity: 0.38,
    },
  },
  {
    id: "fox",
    displayName: "De'Aaron Fox",
    vector: {
      winImpact: 0.77,
      carryBias: 0.7,
      consistency: 0.74,
      clutchDelta: 0.78,
      upsetFactor: 0.53,
      chemistryBias: 0.58,
      personaIntensity: 0.44,
    },
  },
  {
    id: "haliburton",
    displayName: "Tyrese Haliburton",
    vector: {
      winImpact: 0.79,
      carryBias: 0.66,
      consistency: 0.82,
      clutchDelta: 0.76,
      upsetFactor: 0.52,
      chemistryBias: 0.85,
      personaIntensity: 0.36,
    },
  },
  {
    id: "murray",
    displayName: "Jamal Murray",
    vector: {
      winImpact: 0.81,
      carryBias: 0.7,
      consistency: 0.78,
      clutchDelta: 0.86,
      upsetFactor: 0.56,
      chemistryBias: 0.62,
      personaIntensity: 0.4,
    },
  },
  {
    id: "kat",
    displayName: "Karl-Anthony Towns",
    vector: {
      winImpact: 0.81,
      carryBias: 0.68,
      consistency: 0.74,
      clutchDelta: 0.74,
      upsetFactor: 0.51,
      chemistryBias: 0.64,
      personaIntensity: 0.4,
    },
  },
  {
    id: "gobert",
    displayName: "Rudy Gobert",
    vector: {
      winImpact: 0.76,
      carryBias: 0.52,
      consistency: 0.85,
      clutchDelta: 0.62,
      upsetFactor: 0.48,
      chemistryBias: 0.78,
      personaIntensity: 0.42,
    },
  },
  {
    id: "beverley",
    displayName: "Patrick Beverley",
    vector: {
      winImpact: 0.65,
      carryBias: 0.55,
      consistency: 0.7,
      clutchDelta: 0.62,
      upsetFactor: 0.58,
      chemistryBias: 0.62,
      personaIntensity: 0.88,
    },
  },
  {
    id: "smart",
    displayName: "Marcus Smart",
    vector: {
      winImpact: 0.68,
      carryBias: 0.52,
      consistency: 0.74,
      clutchDelta: 0.65,
      upsetFactor: 0.56,
      chemistryBias: 0.72,
      personaIntensity: 0.8,
    },
  },
];

export function computeNbaComparisonRows(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
): NbaComparisonRow[] {
  const roundCountByPlayer = computeRoundCountByPlayer(rounds);
  const rawMap = gatherFriendRawStats(rounds, playerNameById, roundCountByPlayer);
  if (rawMap.size === 0) return [];

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
  const matches = assignUniqueGreedy(friendIds, friendVectors, NBA_COMPARISON_PLAYER_POOL);

  return matches.map((m) => {
    const fit = fitScoreFromDistance(m.distance);
    const playerName = playerNameById.get(m.playerId) ?? String(m.playerId);
    return {
      playerName,
      nbaMatchName: m.nba.displayName,
      fitScore: fit,
    };
  });
}
