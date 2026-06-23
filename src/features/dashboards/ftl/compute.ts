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

/** Generate all 2-element subsets of an array (order-independent, deduped). */
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
  const roundMetaMap = new Map<
    string,
    { numBombs: number; gameMultiplier: number; selections: number[] }
  >();

  for (const round of rounds) {
    const selSet = new Set(round.landlordSideSelections);
    roundLandlordSet.set(round.roundId, selSet);
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

  // Eligible players: 10+ FTL rounds
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

  // Per-player landlord-side stats (no "Overall" row — that's a chip now)
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
      "Per-player win rate when on the landlord side (10+ FTL rounds).",
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
      const frequencyPct = pct(selections, totalPlayed);
      return {
        label: playerDisplayName(players, pid),
        value: frequencyPct,
        valueLabel: formatPct(frequencyPct),
        details: `${selections} selections in ${totalPlayed} rounds`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const frequencySection: FtlDashboardSection = {
    id: "landlordFrequency",
    title: "Landlord Frequency",
    explanation:
      "How often each player is selected for the landlord side, as % of rounds played.",
    rows: frequencyRows,
  };

  // ── Section 3: Alliance Win Rate (2-player combos) ────────────────

  // Step 1: Rank combos by landlord-side co-occurrence win rate (for selection)
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
    .sort(([, a], [, b]) => pct(b.wins, b.total) - pct(a.wins, a.total));

  const topComboKeys = eligibleCombos.slice(0, FTL_TOP_COMBOS_COUNT).map(([k]) => k);
  const bottomComboKeys = eligibleCombos.slice(-FTL_TOP_COMBOS_COUNT).map(([k]) => k);
  const selectedComboKeys = new Set([...topComboKeys, ...bottomComboKeys]);

  // Step 2: Compute individual player win rates across ALL FTL rounds
  // "Win" = positive point_delta
  const playerIndividualWins = new Map<number, { wins: number; total: number }>();
  for (const round of rounds) {
    const entries = roundEntries.filter((e) => e.roundId === round.roundId);
    for (const entry of entries) {
      if (!eligiblePlayerIds.has(entry.playerId)) continue;
      const stat = playerIndividualWins.get(entry.playerId) ?? {
        wins: 0,
        total: 0,
      };
      stat.total++;
      if (entry.pointDelta > 0) stat.wins++;
      playerIndividualWins.set(entry.playerId, stat);
    }
  }

  // Step 3: For selected combos, compute combo win rate + delta vs individual
  // Build per-round participant set
  const roundParticipantSet = new Map<string, Set<number>>();
  for (const entry of roundEntries) {
    let set = roundParticipantSet.get(entry.roundId);
    if (!set) {
      set = new Set();
      roundParticipantSet.set(entry.roundId, set);
    }
    set.add(entry.playerId);
  }

  function signedPct(v: number): string {
    const rounded = Math.round(v * 10) / 10;
    return `${rounded > 0 ? "+" : ""}${rounded}%`;
  }

  function buildComboRows(keys: string[]): FtlStatRow[] {
    const rows: FtlStatRow[] = [];
    for (const key of keys) {
      const [a, b] = key.split("-").map(Number);

      // Combo win rate (both positive) across all rounds together
      let comboWins = 0;
      let comboTotal = 0;
      for (const round of rounds) {
        const participants = roundParticipantSet.get(round.roundId);
        if (!participants?.has(a) || !participants?.has(b)) continue;
        const entries = roundEntries.filter((e) => e.roundId === round.roundId);
        const deltaA = entries.find((e) => e.playerId === a)?.pointDelta ?? 0;
        const deltaB = entries.find((e) => e.playerId === b)?.pointDelta ?? 0;
        comboTotal++;
        if (deltaA > 0 && deltaB > 0) comboWins++;
      }
      if (comboTotal === 0) continue;

      const comboRate = comboWins / comboTotal;

      // Individual win rates
      const statA = playerIndividualWins.get(a);
      const statB = playerIndividualWins.get(b);
      const rateA = statA && statA.total > 0 ? statA.wins / statA.total : null;
      const rateB = statB && statB.total > 0 ? statB.wins / statB.total : null;

      // Expected = average of individual rates
      const expected =
        rateA !== null && rateB !== null ? (rateA + rateB) / 2 : null;

      // Delta = combo rate - expected
      const delta = expected !== null ? comboRate - expected : null;
      const deltaLabel = delta !== null ? signedPct(delta * 100) : "n/a";
      const individualLabel =
        rateA !== null && rateB !== null
          ? `avg ${pct(rateA * 100, 100)}/${pct(rateB * 100, 100)} individually`
          : "";

      rows.push({
        label: comboLabel(players, [a, b]),
        value: delta !== null ? Math.round(delta * 1000) / 10 : 0,
        valueLabel: deltaLabel,
        details: `Together ${pct(comboWins, comboTotal)}% (${comboTotal} rounds) · ${individualLabel}`,
      });
    }
    return rows.sort((a, b) => b.value - a.value);
  }

  const allianceSection: FtlDashboardSplitSection = {
    id: "allianceWinRate",
    title: "Alliance Win Rate",
    explanation:
      "How much better (or worse) a duo performs together vs their individual win rates. Positive = synergy, negative = anti-synergy.",
    positiveTitle: "Best Duos (positive lift)",
    negativeTitle: "Worst Duos (negative lift)",
    positiveRows: buildComboRows(topComboKeys),
    negativeRows: buildComboRows(bottomComboKeys),
  };

  // ── Section 4: Biggest Pots ────────────────────────────────────────

  const potSizes = rounds.map((round) => {
    const meta = roundMetaMap.get(round.roundId)!;
    const potSize =
      1 * meta.gameMultiplier * (meta.numBombs + 1) * meta.selections.length;
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
      valueLabel: `${pot.maxDelta}pts`,
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

  // Track each player's last FTL round (any role, not just landlord-side)
  const playerLastFtlRoundIdx = new Map<number, number>();
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const entriesForRound = roundEntries.filter(
      (e) => e.roundId === round.roundId,
    );
    for (const entry of entriesForRound) {
      if (eligiblePlayerIds.has(entry.playerId)) {
        playerLastFtlRoundIdx.set(entry.playerId, i);
      }
    }
  }

  // Track longest AND current streak per player
  const playerStreaks = new Map<
    number,
    {
      longest: number;
      bestStartIdx: number;
      bestEndIdx: number;
      current: number;
      currentStartIdx: number;
      lastLandlordIdx: number;
    }
  >();

  for (const pid of eligiblePlayerIds) {
    let longest = 0;
    let current = 0;
    let streakStart = 0;
    let bestStart = 0;
    let bestEnd = 0;
    let currentStart = 0;
    let lastLandlordIdx = -1;

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const selSet = roundLandlordSet.get(round.roundId);
      if (!selSet?.has(pid)) continue;

      lastLandlordIdx = i;

      if (round.outcome === "won") {
        if (current === 0) {
          streakStart = i;
          currentStart = i;
        }
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
        bestStartIdx: bestStart,
        bestEndIdx: bestEnd,
        current,
        currentStartIdx: currentStart,
        lastLandlordIdx,
      });
    }
  }

  const lastRoundIdx = rounds.length - 1;

  const streakRows: FtlStatRow[] = [...playerStreaks.entries()]
    .map(([pid, streak]) => {
      const startIdx = streak.bestStartIdx;
      const endIdx = streak.bestEndIdx;
      const startDate = rounds[startIdx].createdAt.slice(0, 10);
      const endDate = rounds[endIdx].createdAt.slice(0, 10);
      // Ongoing: best streak ends at player's last landlord-side round
      // AND that last landlord round is the player's last FTL round
      // AND it was a win (current > 0 and bestEnd == lastLandlordIdx)
      const lastFtlIdx = playerLastFtlRoundIdx.get(pid) ?? -1;
      const bestStreakIsCurrent =
        streak.bestEndIdx === streak.lastLandlordIdx &&
        streak.lastLandlordIdx === lastFtlIdx &&
        streak.current > 0;

      return {
        label: playerDisplayName(players, pid),
        value: streak.longest,
        valueLabel: `${streak.longest} wins`,
        details: bestStreakIsCurrent
          ? `${startDate} – present`
          : `${startDate} → ${endDate}`,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, FTL_TOP_STREAKS_COUNT);

  const streaksSection: FtlDashboardSection = {
    id: "winStreaks",
    title: "Win Streaks",
    explanation:
      "Longest consecutive wins on the landlord side. Ongoing streaks shown with 'present'.",
    rows: streakRows,
  };

  // ── Assemble ──────────────────────────────────────────────────────

  return {
    overallWinRate: {
      rate: overallWinRate,
      wins: totalWins,
      losses: totalRounds - totalWins,
      total: totalRounds,
    },
    sections: [landlordSection, frequencySection, potsSection, streaksSection],
    splitSections: [allianceSection],
    diagnostics: {
      totalRounds: rounds.length,
      eligiblePlayers: eligiblePlayerIds.size,
    },
  };
}
