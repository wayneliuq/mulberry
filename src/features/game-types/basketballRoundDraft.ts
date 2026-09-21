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
  scoringSystem?: "1/2" | "2/3";
};

export type BasketballRoundDraft = {
  /** Roster order (team A then team B); ghosts present with a zero delta. */
  entries: Array<{ playerId: number; pointDelta: number }>;
  /**
   * Ledger-balancing line: -(sum of entries). Ghosts' raw deltas are absorbed
   * here (not redistributed to teammates) so every real player's cumulative
   * total stays exactly LEDGER_SCALE x OpenSkill ordinal.
   */
  houseDelta: number;
};

export function buildBasketballScoredRoundEntries(
  input: BasketballRoundDraftInput,
): BasketballRoundDraft | null {
  const { teamAPlayerIds, teamBPlayerIds, scoreTeamA, scoreTeamB, scoringSystem } = input;

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
    scoringSystem,
  });

  const rosterIds = [...teamAPlayerIds, ...teamBPlayerIds];
  const rawById = new Map(
    result.entries.map((entry) => [Number(entry.playerId), entry.pointDelta]),
  );

  let ghostAbsorbed = 0;
  const entries = rosterIds.map((playerId) => {
    const raw = rawById.get(playerId) ?? 0;
    if (input.ghostPlayerIds.has(playerId)) {
      // Ghosts count toward OpenSkill team strength but keep no ledger points;
      // their share goes to the house instead of to their teammates.
      ghostAbsorbed += raw;
      return { playerId, pointDelta: 0 };
    }
    return { playerId, pointDelta: raw };
  });

  // result.houseDelta is -(all raw deltas), so adding back the ghosts' share
  // leaves exactly -(sum of the entries we keep).
  return { entries, houseDelta: result.houseDelta + ghostAbsorbed };
}
