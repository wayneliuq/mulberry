import { mergeCalculatedEntriesWithGhostZeros } from "../players/playerEligibility";
import {
  roundEntryTotal,
  type ManualPointEntry,
} from "./manualPointBalance";
import {
  calculateBasketballRound,
  priorBasketballMatchesFromSeasonHistory,
  type BasketballMatchInput,
} from "./basketball";

export type BasketballRoundDraftInput = {
  seasonHistory: Array<{ settingsSnapshot?: Record<string, unknown> }>;
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  scoreTeamA: number;
  scoreTeamB: number;
  ghostPlayerIds: Set<number>;
};

export function buildBasketballScoredRoundEntries(
  input: BasketballRoundDraftInput,
): { entries: ManualPointEntry[]; total: number } | null {
  const { teamAPlayerIds, teamBPlayerIds, scoreTeamA, scoreTeamB } = input;

  if (teamAPlayerIds.length < 1 || teamBPlayerIds.length < 1) {
    return null;
  }

  if (
    !Number.isFinite(scoreTeamA) ||
    !Number.isFinite(scoreTeamB) ||
    !Number.isInteger(scoreTeamA) ||
    !Number.isInteger(scoreTeamB) ||
    scoreTeamA < 0 ||
    scoreTeamB < 0
  ) {
    return null;
  }

  const priorRounds: BasketballMatchInput[] =
    priorBasketballMatchesFromSeasonHistory(input.seasonHistory);

  const result = calculateBasketballRound({
    priorRounds,
    match: {
      teamAPlayerIds,
      teamBPlayerIds,
      scoreTeamA,
      scoreTeamB,
    },
  });

  const teamByPlayerId = new Map<number, "A" | "B">();
  for (const id of teamAPlayerIds) {
    teamByPlayerId.set(id, "A");
  }
  for (const id of teamBPlayerIds) {
    teamByPlayerId.set(id, "B");
  }

  const rosterIds = [...teamAPlayerIds, ...teamBPlayerIds];
  const entries = mergeCalculatedEntriesWithGhostZeros(
    result.entries.map((entry) => ({
      playerId: Number(entry.playerId),
      pointDelta: entry.pointDelta,
    })),
    rosterIds,
    input.ghostPlayerIds,
    { teamByPlayerId },
  );

  return { entries, total: roundEntryTotal(entries) };
}
