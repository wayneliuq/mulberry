import { z } from "zod";
import type {
  GameTypeDefinition,
  PointEntry,
  RoundCalculationResult,
} from "./types";

export const WEREWOLF_TEAMS = ["werewolf", "villager", "neutral"] as const;
export type WerewolfTeamId = (typeof WEREWOLF_TEAMS)[number];

const werewolfTeamSchema = z.enum(WEREWOLF_TEAMS);

const playerAssignmentSchema = z.object({
  playerId: z.string().min(1),
  team: werewolfTeamSchema,
});

const werewolvesRoundSchema = z.object({
  activePlayerIds: z.array(z.string().min(1)).min(3),
  pointBasis: z.number().int().positive(),
  playerAssignments: z.array(playerAssignmentSchema).min(3),
  survivedPlayerIds: z.array(z.string().min(1)),
  winningTeamIds: z.array(werewolfTeamSchema).min(1),
});

export type WerewolvesRoundInput = z.infer<typeof werewolvesRoundSchema>;

function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateWerewolvesRound(
  input: WerewolvesRoundInput,
): RoundCalculationResult {
  const parsed = werewolvesRoundSchema.parse(input);
  const T = parsed.activePlayerIds.length;
  const pool = T * parsed.pointBasis;

  const playerTeam = new Map(
    parsed.playerAssignments.map((a) => [a.playerId, a.team]),
  );
  const survivedSet = new Set(parsed.survivedPlayerIds);
  const winningSet = new Set(parsed.winningTeamIds);

  const winnerIds: string[] = [];
  const loserIds: string[] = [];
  for (const pid of parsed.activePlayerIds) {
    const team = playerTeam.get(pid);
    if (!team) continue;
    if (winningSet.has(team)) winnerIds.push(pid);
    else loserIds.push(pid);
  }

  const W = winnerIds.length;
  const L = loserIds.length;

  if (W === 0 || L === 0) {
    throw new Error(
      "Werewolves round needs at least one winning and one losing player.",
    );
  }

  const entriesByPlayer = new Map<string, number>();

  for (const pid of parsed.activePlayerIds) {
    entriesByPlayer.set(pid, 0);
  }

  // Team outcome transfer: full pool moves from losers to winners
  const totalTransfer = pool;
  const perWinner = totalTransfer / W;
  const perLoser = totalTransfer / L;

  for (const pid of winnerIds) {
    entriesByPlayer.set(pid, roundTo1Decimal(perWinner));
  }
  for (const pid of loserIds) {
    entriesByPlayer.set(pid, roundTo1Decimal(-perLoser));
  }

  const aliveCount = parsed.activePlayerIds.filter((id) => survivedSet.has(id))
    .length;
  const deadCount = T - aliveCount;
  if (aliveCount > 0 && deadCount > 0) {
    // Survival layer: fixed pool of pointBasis shared by survivors,
    // funded evenly by dead players.
    const totalAliveBonus = parsed.pointBasis;
    const bonusPerAlive = totalAliveBonus / aliveCount;
    const deductionPerDead = totalAliveBonus / deadCount;
    for (const pid of parsed.activePlayerIds) {
      const current = entriesByPlayer.get(pid) ?? 0;
      if (survivedSet.has(pid)) {
        entriesByPlayer.set(pid, roundTo1Decimal(current + bonusPerAlive));
      } else {
        entriesByPlayer.set(pid, roundTo1Decimal(current - deductionPerDead));
      }
    }
  }

  let entries: PointEntry[] = parsed.activePlayerIds.map((playerId) => ({
    playerId,
    pointDelta: entriesByPlayer.get(playerId) ?? 0,
  }));

  let total = entries.reduce((sum, e) => sum + e.pointDelta, 0);
  if (Math.abs(total) > 0.01 && entries.length > 0) {
    entries = [
      ...entries.slice(0, 1).map((e) => ({
        ...e,
        pointDelta: roundTo1Decimal(e.pointDelta - total),
      })),
      ...entries.slice(1),
    ];
    total = entries.reduce((sum, e) => sum + e.pointDelta, 0);
  }
  const winningTeamsLabel = parsed.winningTeamIds
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(", ");

  return {
    entries,
    total,
    isZeroSum: Math.abs(total) < 0.01,
    summary: `Winners: ${winningTeamsLabel}. Pool ${pool}, ${W} winners / ${L} losers. Alive bonus: ${aliveCount} survived.`,
  };
}

export const werewolvesGameType: GameTypeDefinition<WerewolvesRoundInput> = {
  id: "werewolves",
  name: "Werewolves",
  icon: "cards",
  calculateRound: calculateWerewolvesRound,
};
