import {
  predictBasketballMatchWinProbabilities,
  type BasketballMatchInput,
} from "../../game-types/basketball";
import type { BasketballDashboardData } from "../../../lib/api/types";
import {
  BALANCED_MIN_TEAMMATES,
  CARRY_MIN_SIDE_SAMPLES,
  CLUTCH_MARGIN,
  CLUTCH_MIN_ROUNDS,
  DASHBOARD_MAX_ROUNDS,
  FAMILY_PAIR_MIN_TOGETHER,
  METRIC_META,
  PAIR_MIN_APART,
  PAIR_MIN_TOGETHER,
  PLAYER_MIN_ROUNDS,
  RIVALRY_MIN_MATCHES,
  RIVALRY_VOLUME_REFERENCE,
  TOP_N,
  TRIO_MIN_TOGETHER,
  UPSET_MIN_OPPORTUNITIES,
  UPSET_PROBABILITY_THRESHOLD,
} from "./constants";
import { computeNbaComparisonRows } from "./nbaComparisons";
import type {
  DashboardComputeInput,
  DashboardMetricSection,
  DashboardMetricSplitSection,
  DashboardMetricsModel,
  NormalizedRound,
  RankedMetricRow,
} from "./types";

type WinLoss = { wins: number; losses: number };

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signedPct(value: number): string {
  const p = (value * 100).toFixed(1);
  return `${value > 0 ? "+" : ""}${p}%`;
}

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

function normalizeData(data: BasketballDashboardData, maxRounds: number): NormalizedRound[] {
  const sorted = [...data.rounds].sort((left, right) =>
    left.createdAt === right.createdAt
      ? left.roundId.localeCompare(right.roundId)
      : left.createdAt.localeCompare(right.createdAt),
  );
  const rounds = sorted.slice(Math.max(0, sorted.length - maxRounds));
  const entriesByRoundId = new Map<string, Map<number, number>>();
  for (const entry of data.roundEntries) {
    const perRound = entriesByRoundId.get(entry.roundId) ?? new Map<number, number>();
    perRound.set(entry.playerId, entry.pointDelta);
    entriesByRoundId.set(entry.roundId, perRound);
  }
  return rounds.map((round) => {
    const teamASet = new Set(round.teamAPlayerIds);
    const teamBSet = new Set(round.teamBPlayerIds);
    const participants = [...teamASet, ...teamBSet];
    const scoreMargin = Math.abs(round.scoreTeamA - round.scoreTeamB);
    const winnerTeam =
      round.scoreTeamA > round.scoreTeamB
        ? "A"
        : round.scoreTeamB > round.scoreTeamA
          ? "B"
          : "draw";
    return {
      ...round,
      teamASet,
      teamBSet,
      participants,
      winnerTeam,
      scoreMargin,
      entryPointDeltaByPlayerId: entriesByRoundId.get(round.roundId) ?? new Map(),
    };
  });
}

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

function topRows(rows: RankedMetricRow[], count: number): RankedMetricRow[] {
  return rows.slice(0, count);
}

function computeComboSections(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
): DashboardMetricSplitSection[] {
  const eligiblePlayerIds = Array.from(roundCountByPlayer.entries())
    .filter(([, roundsPlayed]) => roundsPlayed >= PLAYER_MIN_ROUNDS)
    .map(([playerId]) => playerId)
    .sort((a, b) => a - b);

  const pairs = new Map<
    string,
    {
      a: number;
      b: number;
      together: WinLoss;
      apartA: WinLoss;
      apartB: WinLoss;
      bothPlayed: number;
      sameTeamRounds: number;
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
        bothPlayed: 0,
        sameTeamRounds: 0,
      });
    }
  }

  for (const round of rounds) {
    for (const pair of pairs.values()) {
      const aPresent = round.teamASet.has(pair.a) || round.teamBSet.has(pair.a);
      const bPresent = round.teamASet.has(pair.b) || round.teamBSet.has(pair.b);
      const sameTeam = aPresent && bPresent && areTeammates(round, pair.a, pair.b);
      if (aPresent && bPresent) {
        pair.bothPlayed += 1;
      }

      if (sameTeam) {
        pair.sameTeamRounds += 1;
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

  const comboRows: RankedMetricRow[] = [];
  const familyRows: Array<RankedMetricRow & { sharedRounds: number }> = [];
  for (const pair of pairs.values()) {
    const togetherGames = pair.together.wins + pair.together.losses;
    const apartAGames = pair.apartA.wins + pair.apartA.losses;
    const apartBGames = pair.apartB.wins + pair.apartB.losses;
    const label = `${playerNameById.get(pair.a) ?? pair.a} + ${playerNameById.get(pair.b) ?? pair.b}`;
    if (pair.bothPlayed >= FAMILY_PAIR_MIN_TOGETHER) {
      const sameTeamRate =
        pair.bothPlayed > 0 ? pair.sameTeamRounds / pair.bothPlayed : 0;
      const togetherRate = togetherGames > 0 ? pair.together.wins / togetherGames : null;
      const apartRate =
        apartAGames > 0 && apartBGames > 0
          ? (pair.apartA.wins / apartAGames + pair.apartB.wins / apartBGames) / 2
          : null;
      const deltaLabel =
        togetherRate !== null && apartRate !== null
          ? signedPct(togetherRate - apartRate)
          : "n/a";
      familyRows.push({
        label,
        value: sameTeamRate,
        valueLabel: pct(sameTeamRate),
        details: `${pair.sameTeamRounds}/${pair.bothPlayed} shared rounds on same team · win-rate delta ${deltaLabel} vs apart`,
        sharedRounds: pair.bothPlayed,
      });
    }
    if (togetherGames < PAIR_MIN_TOGETHER || apartAGames < PAIR_MIN_APART || apartBGames < PAIR_MIN_APART) {
      continue;
    }
    const togetherRate = pair.together.wins / togetherGames;
    const apartARate = pair.apartA.wins / apartAGames;
    const apartBRate = pair.apartB.wins / apartBGames;
    const apartRate = (apartARate + apartBRate) / 2;
    const lift = togetherRate - apartRate;
    comboRows.push({
      label,
      value: lift,
      valueLabel: signedPct(lift),
      details: `Together ${pct(togetherRate)} (${togetherGames}) vs apart avg ${pct(apartRate)} (${apartAGames}/${apartBGames})`,
    });
  }

  comboRows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  familyRows.sort(
    (a, b) =>
      b.value - a.value ||
      b.sharedRounds - a.sharedRounds ||
      a.label.localeCompare(b.label),
  );

  return [
    {
      id: "combos",
      title: "Best / Worst Combos",
      positiveTitle: "Best combo lifts",
      negativeTitle: "Worst combo lifts",
      positiveRows: topRows(comboRows, TOP_N.combos),
      negativeRows: topRows([...comboRows].reverse(), TOP_N.combos),
      ...METRIC_META.combos,
    },
    {
      id: "families",
      title: "Homegrown Families / Factions",
      positiveTitle: "Most frequently same-team pairs",
      negativeTitle: "No secondary ranking",
      positiveRows: familyRows
        .slice(0, TOP_N.family)
        .map(({ sharedRounds, ...row }) => row),
      negativeRows: [],
      ...METRIC_META.families,
    },
  ];
}

function computeClutchSection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
): DashboardMetricSplitSection {
  const overall = new Map<number, WinLoss>();
  const close = new Map<number, WinLoss>();
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
    }
  }
  const rows: RankedMetricRow[] = [];
  for (const [playerId, o] of overall.entries()) {
    const totalRounds = roundCountByPlayer.get(playerId) ?? 0;
    const c = close.get(playerId) ?? { wins: 0, losses: 0 };
    const closeGames = c.wins + c.losses;
    if (totalRounds < PLAYER_MIN_ROUNDS || closeGames < CLUTCH_MIN_ROUNDS) continue;
    const overallRate = o.wins / (o.wins + o.losses);
    const closeRate = c.wins / closeGames;
    const value = closeRate - overallRate;
    rows.push({
      label: playerNameById.get(playerId) ?? String(playerId),
      value,
      valueLabel: signedPct(value),
      details: `Close ${pct(closeRate)} (${closeGames}) vs overall ${pct(overallRate)} (${o.wins + o.losses})`,
    });
  }
  rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return {
    id: "clutch",
    title: "Clutch Index",
    positiveTitle: "Best under pressure",
    negativeTitle: "Drops in close games",
    positiveRows: topRows(rows, TOP_N.clutch),
    negativeRows: topRows([...rows].reverse(), TOP_N.clutch),
    ...METRIC_META.clutch,
  };
}

function computeRivalrySection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
): DashboardMetricSection {
  const records = new Map<
    string,
    { a: number; b: number; aWins: number; bWins: number; bothPlayed: number; oppositeTeams: number }
  >();

  for (const round of rounds) {
    for (let i = 0; i < round.participants.length; i++) {
      for (let j = i + 1; j < round.participants.length; j++) {
        const a = round.participants[i]!;
        const b = round.participants[j]!;
        const key = keyForPair(a, b);
        const existing =
          records.get(key) ?? {
            a: Math.min(a, b),
            b: Math.max(a, b),
            aWins: 0,
            bWins: 0,
            bothPlayed: 0,
            oppositeTeams: 0,
          };
        existing.bothPlayed += 1;
        const opposite = !areTeammates(round, a, b);
        if (opposite) {
          existing.oppositeTeams += 1;
        }
        records.set(key, existing);
      }
    }
  }

  for (const round of rounds) {
    if (round.winnerTeam === "draw") continue;
    for (const a of round.teamASet) {
      for (const b of round.teamBSet) {
        const key = keyForPair(a, b);
        const existing =
          records.get(key) ?? {
            a: Math.min(a, b),
            b: Math.max(a, b),
            aWins: 0,
            bWins: 0,
            bothPlayed: 0,
            oppositeTeams: 0,
          };
        const canonicalAIsTeamA = existing.a === a;
        const teamAWon = round.winnerTeam === "A";
        const canonicalAWon = canonicalAIsTeamA ? teamAWon : !teamAWon;
        if (canonicalAWon) existing.aWins += 1;
        else existing.bWins += 1;
        records.set(key, existing);
      }
    }
  }
  const rows = Array.from(records.values())
    .filter((record) => record.oppositeTeams >= RIVALRY_MIN_MATCHES)
    .map((record) => {
      const headToHeadTotal = record.aWins + record.bWins;
      const aWinRate = headToHeadTotal > 0 ? record.aWins / headToHeadTotal : 0.5;
      // Rivalries are most interesting when the matchup is near 50/50, but
      // we also want more rounds to count as stronger evidence.
      const parityScore = 1 - Math.min(1, Math.abs(aWinRate - 0.5) * 2);
      const volumeWeight = Math.min(
        1,
        Math.log1p(record.oppositeTeams) / Math.log1p(RIVALRY_VOLUME_REFERENCE),
      );
      return { record, rivalryScore: parityScore * volumeWeight };
    })
    .sort((a, b) => {
      if (b.rivalryScore !== a.rivalryScore) return b.rivalryScore - a.rivalryScore;
      const labelA = `${playerNameById.get(a.record.a) ?? a.record.a} vs ${playerNameById.get(a.record.b) ?? a.record.b}`;
      const labelB = `${playerNameById.get(b.record.a) ?? b.record.a} vs ${playerNameById.get(b.record.b) ?? b.record.b}`;
      return labelA.localeCompare(labelB);
    })
    .map<RankedMetricRow>(({ record, rivalryScore }) => ({
      label: `${playerNameById.get(record.a) ?? record.a} vs ${playerNameById.get(record.b) ?? record.b}`,
      value: rivalryScore,
      valueLabel: pct(rivalryScore),
      details: `${record.aWins}-${record.bWins} head-to-head (${record.oppositeTeams} opposite-team rounds)`,
    }));
  return {
    id: "rivalry",
    title: "Rivalry Board",
    rows: topRows(rows, TOP_N.rivalry),
    ...METRIC_META.rivalry,
  };
}

function computeCarrySection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
  rankByPlayerId: Map<number, number>,
): DashboardMetricSplitSection {
  const lower = new Map<number, WinLoss>();
  const higher = new Map<number, WinLoss>();
  for (const round of rounds) {
    for (const playerId of round.participants) {
      const win = didPlayerWin(round, playerId);
      if (win === null) continue;
      const myRank = rankByPlayerId.get(playerId);
      if (!myRank) continue;
      const teammates = round.teamASet.has(playerId)
        ? round.teamAPlayerIds.filter((id) => id !== playerId)
        : round.teamBPlayerIds.filter((id) => id !== playerId);
      if (teammates.length === 0) continue;
      for (const teammateId of teammates) {
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
  }
  const rows: RankedMetricRow[] = [];
  for (const [playerId, lowerWL] of lower.entries()) {
    const roundsPlayed = roundCountByPlayer.get(playerId) ?? 0;
    const higherWL = higher.get(playerId) ?? { wins: 0, losses: 0 };
    const lowerGames = lowerWL.wins + lowerWL.losses;
    const higherGames = higherWL.wins + higherWL.losses;
    if (
      roundsPlayed < PLAYER_MIN_ROUNDS ||
      lowerGames < CARRY_MIN_SIDE_SAMPLES ||
      higherGames < CARRY_MIN_SIDE_SAMPLES
    ) {
      continue;
    }
    const lowerRate = lowerWL.wins / lowerGames;
    const higherRate = higherWL.wins / higherGames;
    const score = lowerRate - higherRate;
    rows.push({
      label: playerNameById.get(playerId) ?? String(playerId),
      value: score,
      valueLabel: signedPct(score),
      details: `Lower-ranked teammate samples ${pct(lowerRate)} (${lowerGames}) vs stronger ${pct(higherRate)} (${higherGames})`,
    });
  }
  rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return {
    id: "carry",
    title: "Carry Score",
    positiveTitle: "Best carry profiles",
    negativeTitle: "Best with stronger teammates",
    positiveRows: topRows(rows, TOP_N.carry),
    negativeRows: topRows([...rows].reverse(), TOP_N.carry),
    ...METRIC_META.carry,
  };
}

function computeConsistencySection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
): DashboardMetricSplitSection {
  const deltasByPlayer = new Map<number, number[]>();
  for (const round of rounds) {
    for (const [playerId, delta] of round.entryPointDeltaByPlayerId.entries()) {
      const deltas = deltasByPlayer.get(playerId) ?? [];
      deltas.push(delta);
      deltasByPlayer.set(playerId, deltas);
    }
  }
  const rows: RankedMetricRow[] = [];
  for (const [playerId, deltas] of deltasByPlayer.entries()) {
    if ((roundCountByPlayer.get(playerId) ?? 0) < PLAYER_MIN_ROUNDS) continue;
    const volatility = stdev(deltas);
    rows.push({
      label: playerNameById.get(playerId) ?? String(playerId),
      value: volatility,
      valueLabel: volatility.toFixed(2),
      details: `${deltas.length} rounds, avg delta ${(deltas.reduce((s, d) => s + d, 0) / deltas.length).toFixed(2)}`,
    });
  }
  rows.sort((a, b) => a.value - b.value || a.label.localeCompare(b.label));
  return {
    id: "consistency",
    title: "Consistency",
    positiveTitle: "Most consistent",
    negativeTitle: "Most volatile",
    positiveRows: topRows(rows, TOP_N.consistency),
    negativeRows: topRows([...rows].reverse(), TOP_N.consistency),
    ...METRIC_META.consistency,
  };
}

function computeUpsetSection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
): DashboardMetricSection {
  const opportunities = new Map<number, WinLoss>();
  const priors: BasketballMatchInput[] = [];
  for (const round of rounds) {
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
          const win = didPlayerWin(round, playerId);
          if (win) wl.wins += 1;
          else wl.losses += 1;
          opportunities.set(playerId, wl);
        }
      }
    }
  }
  const rows: RankedMetricRow[] = [];
  for (const [playerId, wl] of opportunities.entries()) {
    if ((roundCountByPlayer.get(playerId) ?? 0) < PLAYER_MIN_ROUNDS) continue;
    const total = wl.wins + wl.losses;
    if (total < UPSET_MIN_OPPORTUNITIES) continue;
    const rate = wl.wins / total;
    rows.push({
      label: playerNameById.get(playerId) ?? String(playerId),
      value: rate,
      valueLabel: pct(rate),
      details: `${wl.wins}-${wl.losses} in ${total} upset opportunities`,
    });
  }
  rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return {
    id: "upset",
    title: "Upset Machine",
    rows: topRows(rows, TOP_N.upset),
    ...METRIC_META.upset,
  };
}

function computeTriosSection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
): DashboardMetricSplitSection {
  const trioTogether = new Map<string, WinLoss & { trio: number[] }>();
  const playerOverall = new Map<number, WinLoss>();
  for (const round of rounds) {
    for (const playerId of round.participants) {
      const win = didPlayerWin(round, playerId);
      if (win === null) continue;
      const overall = playerOverall.get(playerId) ?? { wins: 0, losses: 0 };
      if (win) overall.wins += 1;
      else overall.losses += 1;
      playerOverall.set(playerId, overall);
    }
    const teams = [round.teamAPlayerIds, round.teamBPlayerIds];
    for (const team of teams) {
      if (team.length < 3 || round.winnerTeam === "draw") continue;
      const teamWon =
        (team === round.teamAPlayerIds && round.winnerTeam === "A") ||
        (team === round.teamBPlayerIds && round.winnerTeam === "B");
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          for (let k = j + 1; k < team.length; k++) {
            const trio = [team[i]!, team[j]!, team[k]!].sort((a, b) => a - b);
            const key = `${trio[0]}|${trio[1]}|${trio[2]}`;
            const current =
              trioTogether.get(key) ?? { trio, wins: 0, losses: 0 };
            if (teamWon) current.wins += 1;
            else current.losses += 1;
            trioTogether.set(key, current);
          }
        }
      }
    }
  }
  const rows: RankedMetricRow[] = [];
  for (const trioRow of trioTogether.values()) {
    const games = trioRow.wins + trioRow.losses;
    if (games < TRIO_MIN_TOGETHER) continue;
    const trioRate = trioRow.wins / games;
    const baseline = trioRow.trio
      .map((id) => {
        const overall = playerOverall.get(id);
        if (!overall) return 0;
        const total = overall.wins + overall.losses;
        return total > 0 ? overall.wins / total : 0;
      })
      .reduce((sum, rate) => sum + rate, 0) / trioRow.trio.length;
    const lift = trioRate - baseline;
    rows.push({
      label: trioRow.trio.map((id) => playerNameById.get(id) ?? id).join(" + "),
      value: lift,
      valueLabel: signedPct(lift),
      details: `Trio ${pct(trioRate)} (${games}) vs member baseline ${pct(baseline)}`,
    });
  }
  rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return {
    id: "trios",
    title: "Lineup Chemistry Map (3-player units)",
    positiveTitle: "Best trios",
    negativeTitle: "Worst trios",
    positiveRows: topRows(rows, TOP_N.trios),
    negativeRows: topRows([...rows].reverse(), TOP_N.trios),
    ...METRIC_META.trios,
  };
}

function computeBalancedSection(
  rounds: NormalizedRound[],
  playerNameById: Map<number, string>,
  roundCountByPlayer: Map<number, number>,
): DashboardMetricSection {
  const wlByPlayer = new Map<number, WinLoss>();
  const teammateCounts = new Map<number, Map<number, number>>();
  for (const round of rounds) {
    for (const playerId of round.participants) {
      const win = didPlayerWin(round, playerId);
      if (win === null) continue;
      const wl = wlByPlayer.get(playerId) ?? { wins: 0, losses: 0 };
      if (win) wl.wins += 1;
      else wl.losses += 1;
      wlByPlayer.set(playerId, wl);
      const teammates = round.teamASet.has(playerId)
        ? round.teamAPlayerIds.filter((id) => id !== playerId)
        : round.teamBPlayerIds.filter((id) => id !== playerId);
      const counts = teammateCounts.get(playerId) ?? new Map<number, number>();
      for (const teammateId of teammates) {
        counts.set(teammateId, (counts.get(teammateId) ?? 0) + 1);
      }
      teammateCounts.set(playerId, counts);
    }
  }
  const eligible = Array.from(wlByPlayer.entries())
    .filter(([playerId]) => (roundCountByPlayer.get(playerId) ?? 0) >= PLAYER_MIN_ROUNDS)
    .filter(([playerId]) => (teammateCounts.get(playerId)?.size ?? 0) >= BALANCED_MIN_TEAMMATES)
    .map(([playerId, wl]) => {
      const total = wl.wins + wl.losses;
      const winRate = total > 0 ? wl.wins / total : 0;
      const teammateEntropy = entropy(Array.from(teammateCounts.get(playerId)?.values() ?? []));
      return { playerId, winRate, teammateEntropy, totalRounds: total };
    });
  if (eligible.length === 0) {
    return {
      id: "balanced",
      title: "Balanced Teammate Index",
      rows: [],
      ...METRIC_META.balanced,
    };
  }
  const maxEntropy = Math.max(...eligible.map((row) => row.teammateEntropy), 1);
  const rows = eligible
    .map<RankedMetricRow>((row) => {
      const score = row.winRate * 0.65 + (row.teammateEntropy / maxEntropy) * 0.35;
      return {
        label: playerNameById.get(row.playerId) ?? String(row.playerId),
        value: score,
        valueLabel: score.toFixed(3),
        details: `${pct(row.winRate)} win rate, diversity ${(row.teammateEntropy / maxEntropy).toFixed(2)} (${row.totalRounds} rounds)`,
      };
    })
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return {
    id: "balanced",
    title: "Balanced Teammate Index",
    rows: topRows(rows, TOP_N.balanced),
    ...METRIC_META.balanced,
  };
}

export function buildBasketballDashboardMetrics(
  input: DashboardComputeInput,
): DashboardMetricsModel {
  const rounds = normalizeData(input.data, input.maxRounds);
  const playerNameById = new Map(
    input.data.players.map((player) => [player.id, player.displayName]),
  );
  const roundCountByPlayer = computeRoundCountByPlayer(rounds);
  const rankByPlayerId = computeOverallRankByPoints(rounds);

  const splitSections: DashboardMetricSplitSection[] = [
    ...computeComboSections(rounds, playerNameById, roundCountByPlayer),
    computeClutchSection(rounds, playerNameById, roundCountByPlayer),
    computeCarrySection(rounds, playerNameById, roundCountByPlayer, rankByPlayerId),
    computeConsistencySection(rounds, playerNameById, roundCountByPlayer),
    computeTriosSection(rounds, playerNameById),
  ];

  const sections: DashboardMetricSection[] = [
    computeRivalrySection(rounds, playerNameById),
    computeUpsetSection(rounds, playerNameById, roundCountByPlayer),
    computeBalancedSection(rounds, playerNameById, roundCountByPlayer),
  ];

  return {
    splitSections,
    sections,
    nbaComparisons: computeNbaComparisonRows(rounds, playerNameById),
    diagnostics: {
      totalRounds: input.data.rounds.length,
      eligibleRounds: rounds.length,
      computedAtIso: new Date().toISOString(),
    },
  };
}

export function buildBasketballDashboardMetricsFromData(
  data: BasketballDashboardData,
): DashboardMetricsModel {
  return buildBasketballDashboardMetrics({
    data,
    maxRounds: DASHBOARD_MAX_ROUNDS,
  });
}
