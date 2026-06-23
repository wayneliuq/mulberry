import type {
  FtlDashboardData,
  FtlDashboardModel,
  FtlDashboardSection,
  FtlDashboardSplitSection,
  FtlStatRow,
} from "./types";
import {
  FTL_MIN_ROUNDS,
  FTL_MIN_COMBO_ROUNDS,
  FTL_TOP_POTS_COUNT,
  FTL_TOP_STREAKS_COUNT,
  FTL_TOP_COMBOS_COUNT,
} from "./constants";

// ── Helpers ──────────────────────────────────────────────────────────

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

function formatPct(v: number): string {
  return `${v}%`;
}

/** Generate all 2-element subsets of an array (order-independent). */
function pairs(arr: number[]): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      result.push([arr[i], arr[j]]);
    }
  }
  return result;
}

function playerDisplayName(
  players: FtlDashboardData["players"],
  id: number,
): string {
  return players.find((p) => p.id === id)?.displayName ?? String(id);
}

function comboLabel(
  players: FtlDashboardData["players"],
  ids: [number, number],
): string {
  return ids
    .map((id) => playerDisplayName(players, id))
    .sort()
    .join(" + ");
}

// ── Main compute ─────────────────────────────────────────────────────

export function buildFtlDashboardMetrics(
  data: FtlDashboardData,
): FtlDashboardModel {
  const { players, rounds, roundEntries } = data;

  // Build per-round lookup: roundId → Set<playerId> of landlord-side players
  const roundLandlordSet = new Map<string, Set<number>>();
  const roundOutcomeMap = new Map<string, "won" | "lost">();
  const roundMetaMap = new Map<
    string,
    { numBombs: number; gameMultiplier: number; selections: number[] }
  >();

  for (const round of rounds) {
    const selSet = new Set(round.landlordSideSelections);
    roundLandlordSet.set(round.roundId, selSet);
    roundOutcomeMap.set(round.roundId, round.outcome);
    roundMetaMap.set(round.roundId, {
      numBombs: round.numBombs,
      gameMultiplier: round.gameMultiplier,
      selections: round.landlordSideSelections,
    });
  }

  // Build per-player round counts (FTL rounds only)
  const playerRoundCounts = new Map<number, number>();
  for (const entry of roundEntries) {
    playerRoundCounts.set(
      entry.playerId,
      (playerRoundCounts.get(entry.playerId) ?? 0) + 1,
    );
  }

  // Eligible players: 10+ total rounds
  const eligiblePlayerIds = new Set<number>();
  for (const [pid, count] of playerRoundCounts) {
    if (count >= FTL_MIN_ROUNDS) {
      eligiblePlayerIds.add(pid);
    }
  }

  // ── Section 1: Landlord Win Rate ───────────────────────────────────

  // Overall
  let totalRounds = 0;
  let totalWins = 0;
  for (const round of rounds) {
    totalRounds++;
    if (round.outcome === "won") totalWins++;
  }
  const overallWinRate = pct(totalWins, totalRounds);

  // Per-player landlord-side stats
  const playerLandlordStats = new Map<
    number,
    { landlordRounds: number; wins: number }
  >();
  for (const round of rounds) {
    const selSet = roundLandlordSet.get(round.roundId)!;
    const won = round.outcome === "won";
    for (const pid of selSet) {
      if (!eligiblePlayerIds.has(pid)) continue;
      const stat = playerLandlordStats.get(pid) ?? {
        landlordRounds: 0,
        wins: 0,
      };
      stat.landlordRounds++;
      if (won) stat.wins++;
      playerLandlordStats.set(pid, stat);
    }
  }

  const landlordRows: FtlStatRow[] = [
    {
      label: "Overall",
      value: overallWinRate,
      valueLabel: formatPct(overallWinRate),
      details: `${totalWins}W / ${totalRounds - totalWins}L in ${totalRounds} rounds`,
    },
    ...[...playerLandlordStats.entries()]
      .filter(([, s]) => s.landlordRounds >= FTL_MIN_ROUNDS)
      .map(([pid, s]) => {
        const wr = pct(s.wins, s.landlordRounds);
        return {
          label: playerDisplayName(players, pid),
          value: wr,
          valueLabel: formatPct(wr),
          details: `${s.wins}W / ${s.landlordRounds - s.wins}L in ${s.landlordRounds} rounds on landlord side`,
        };
      })
      .sort((a, b) => b.value - a.value),
  ];

  const landlordSection: FtlDashboardSection = {
    id: "landlordWinRate",
    title: "Landlord Side Win Rate",
    explanation:
      "How often the landlord side wins. Overall rate plus per-player rate when on the landlord side.",
    rows: landlordRows,
  };

  // ── Section 2: Landlord Frequency ─────────────────────────────────

  const playerSelectionCounts = new Map<number, number>();
  for (const round of rounds) {
    for (const pid of round.landlordSideSelections) {
      if (!eligiblePlayerIds.has(pid)) continue;
      playerSelectionCounts.set(
        pid,
        (playerSelectionCounts.get(pid) ?? 0) + 1,
      );
    }
  }

  const frequencyRows: FtlStatRow[] = [...playerSelectionCounts.entries()]
    .filter(([pid]) => eligiblePlayerIds.has(pid))
    .map(([pid, selections]) => {
      const totalPlayed = playerRoundCounts.get(pid) ?? 1;
      const perRound = Math.round((selections / totalPlayed) * 100) / 100;
      return {
        label: playerDisplayName(players, pid),
        value: selections,
        valueLabel: `${selections}`,
        details: `${perRound}x per round · ${totalPlayed} rounds played`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const frequencySection: FtlDashboardSection = {
    id: "landlordFrequency",
    title: "Landlord Frequency",
    explanation:
      "How often each player is selected for the landlord side. Higher = more time as 地主 or ally.",
    rows: frequencyRows,
  };

  // ── Section 3: Alliance Win Rate (2-player combos) ────────────────

  const comboStats = new Map<string, { wins: number; total: number }>();
  for (const round of rounds) {
    const selSet = round.landlordSideSelections;
    const eligibleInRound = selSet.filter((pid) => eligiblePlayerIds.has(pid));
    const roundPairs = pairs([...new Set(eligibleInRound)]);
    const won = round.outcome === "won";
    for (const [a, b] of roundPairs) {
      const key = [a, b].sort().join("-");
      const stat = comboStats.get(key) ?? { wins: 0, total: 0 };
      stat.total++;
      if (won) stat.wins++;
      comboStats.set(key, stat);
    }
  }

  const eligibleCombos = [...comboStats.entries()]
    .filter(([, s]) => s.total >= FTL_MIN_COMBO_ROUNDS)
    .map(([key, s]) => {
      const [a, b] = key.split("-").map(Number);
      const wr = pct(s.wins, s.total);
      return {
        label: comboLabel(players, [a, b]),
        value: wr,
        valueLabel: formatPct(wr),
        details: `${s.wins}W / ${s.total - s.wins}L in ${s.total} rounds`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const topCombos = eligibleCombos.slice(0, FTL_TOP_COMBOS_COUNT);
  const bottomCombos = eligibleCombos
    .slice(-FTL_TOP_COMBOS_COUNT)
    .reverse();

  const allianceSection: FtlDashboardSplitSection = {
    id: "allianceWinRate",
    title: "Alliance Win Rate",
    explanation:
      "2-player combos on the landlord side. Top and bottom duos by win rate (min 3 rounds together).",
    positiveTitle: "Best Duos",
    negativeTitle: "Worst Duos",
    positiveRows: topCombos,
    negativeRows: bottomCombos,
  };

  // ── Section 4: Biggest Pots ────────────────────────────────────────

  const potSizes = rounds.map((round) => {
    const meta = roundMetaMap.get(round.roundId)!;
    const potSize =
      1 * meta.gameMultiplier * (meta.numBombs + 1) * meta.selections.length;
    // Find max absolute point delta for this round
    const entries = roundEntries.filter((e) => e.roundId === round.roundId);
    const maxDelta = Math.max(...entries.map((e) => Math.abs(e.pointDelta)));
    return { round, potSize, maxDelta, meta, entries };
  });

  potSizes.sort((a, b) => b.maxDelta - a.maxDelta);
  const topPots = potSizes.slice(0, FTL_TOP_POTS_COUNT);

  const potRows: FtlStatRow[] = topPots.map((pot) => {
    const date = pot.round.createdAt.slice(0, 10);
    const winners = pot.entries
      .filter((e) => e.pointDelta > 0)
      .map((e) => playerDisplayName(players, e.playerId))
      .join(", ");
    const losers = pot.entries
      .filter((e) => e.pointDelta < 0)
      .map((e) => playerDisplayName(players, e.playerId))
      .join(", ");
    return {
      label: date,
      value: pot.maxDelta,
      valueLabel: `${pot.maxDelta} pts`,
      details: `${pot.meta.numBombs} bombs · ${pot.meta.gameMultiplier}x · Won: ${winners} · Lost: ${losers}`,
    };
  });

  const potsSection: FtlDashboardSection = {
    id: "biggestPots",
    title: "Biggest Pots",
    explanation:
      "Rounds with the largest individual point swings. Bombs and multipliers create massive pots.",
    rows: potRows,
  };

  // ── Section 5: Win Streaks ─────────────────────────────────────────

  // For each eligible player, find longest consecutive landlord-side win streak
  const playerStreaks = new Map<
    number,
    { longest: number; startIdx: number; endIdx: number }
  >();

  for (const pid of eligiblePlayerIds) {
    let longest = 0;
    let current = 0;
    let streakStart = 0;
    let bestStart = 0;
    let bestEnd = 0;

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const selSet = roundLandlordSet.get(round.roundId);
      if (!selSet?.has(pid)) continue;

      if (round.outcome === "won") {
        if (current === 0) streakStart = i;
        current++;
        if (current > longest) {
          longest = current;
          bestStart = streakStart;
          bestEnd = i;
        }
      } else {
        current = 0;
      }
    }

    if (longest > 0) {
      playerStreaks.set(pid, {
        longest,
        startIdx: bestStart,
        endIdx: bestEnd,
      });
    }
  }

  const streakRows: FtlStatRow[] = [...playerStreaks.entries()]
    .sort(([, a], [, b]) => b.longest - a.longest)
    .slice(0, FTL_TOP_STREAKS_COUNT)
    .map(([pid, streak]) => {
      const startDate = rounds[streak.startIdx].createdAt.slice(0, 10);
      const endDate = rounds[streak.endIdx].createdAt.slice(0, 10);
      return {
        label: playerDisplayName(players, pid),
        value: streak.longest,
        valueLabel: `${streak.longest} wins`,
        details: `${startDate} → ${endDate}`,
      };
    });

  const streaksSection: FtlDashboardSection = {
    id: "winStreaks",
    title: "Win Streaks",
    explanation:
      "Longest consecutive wins on the landlord side. Consistency at being 地主.",
    rows: streakRows,
  };

  // ── Assemble ──────────────────────────────────────────────────────

  return {
    sections: [landlordSection, frequencySection, potsSection, streaksSection],
    splitSections: [allianceSection],
    diagnostics: {
      totalRounds: rounds.length,
      eligiblePlayers: eligiblePlayerIds.size,
    },
  };
}
