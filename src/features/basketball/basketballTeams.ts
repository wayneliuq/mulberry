/**
 * Team-count plumbing shared by "Pick teams", the saved-lineup presets and the
 * round form.
 *
 * A lineup is 2–6 teams (letters A–F). A *scored round* is still exactly two of
 * those teams playing each other — the matchup — because the stored round
 * metadata (and the OpenSkill replay built on it) is a two-sided
 * `teamAPlayerIds` / `teamBPlayerIds` record. Teams outside the matchup sit out
 * the round and take no points.
 */

export const MIN_BASKETBALL_TEAM_COUNT = 2;
export const MAX_BASKETBALL_TEAM_COUNT = 6;

export type BasketballTeamLetter = "A" | "B" | "C" | "D" | "E" | "F";
export type BasketballTeamChoice = "none" | BasketballTeamLetter;

export const ALL_BASKETBALL_TEAM_LETTERS: readonly BasketballTeamLetter[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

/** Selectable team counts, in the order they render. */
export const BASKETBALL_TEAM_COUNT_OPTIONS: readonly number[] = [2, 3, 4, 5, 6];

export type BasketballTeamAssignments = Record<
  number,
  BasketballTeamChoice | undefined
>;

/** A round is always team `home` vs team `away`; the rest of the lineup sits out. */
export type BasketballMatchup = {
  home: BasketballTeamLetter;
  away: BasketballTeamLetter;
};

export const DEFAULT_BASKETBALL_MATCHUP: BasketballMatchup = {
  home: "A",
  away: "B",
};

export function clampBasketballTeamCount(count: number): number {
  if (!Number.isFinite(count)) {
    return MIN_BASKETBALL_TEAM_COUNT;
  }
  return Math.max(
    MIN_BASKETBALL_TEAM_COUNT,
    Math.min(MAX_BASKETBALL_TEAM_COUNT, Math.trunc(count)),
  );
}

/** Letters in play for a lineup of `count` teams: 2 -> [A, B], 4 -> [A, B, C, D]. */
export function basketballTeamLetters(count: number): BasketballTeamLetter[] {
  return ALL_BASKETBALL_TEAM_LETTERS.slice(0, clampBasketballTeamCount(count));
}

/**
 * The team sizes "Pick teams" will produce, largest first.
 *
 * Even counts are a hard rule in `balanceBasketballTeams`, not a preference:
 * every team gets `floor(N / K)` players and the first `N % K` teams get one
 * extra, so sizes never differ by more than one. 8 players over 2 teams is
 * `[4, 4]`; 8 over 3 is `[3, 3, 2]`. Fewer players than teams yields an empty
 * list — that roster cannot be split at all.
 */
export function basketballTeamSizes(
  playerCount: number,
  teamCount: number,
): number[] {
  const teams = clampBasketballTeamCount(teamCount);
  if (!Number.isFinite(playerCount) || playerCount < teams) {
    return [];
  }
  const players = Math.trunc(playerCount);
  const base = Math.floor(players / teams);
  const remainder = players % teams;
  return Array.from({ length: teams }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

type PresetLike = {
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  teams?: number[][] | null;
};

/**
 * Partitions a saved preset describes. Presets written before multi-team
 * lineups (and any row whose `teams` column is null or malformed) only carry
 * the two sides, so fall back to those.
 */
export function basketballPresetPartitions(preset: PresetLike): number[][] {
  if (preset.teams && preset.teams.length >= MIN_BASKETBALL_TEAM_COUNT) {
    return preset.teams.slice(0, MAX_BASKETBALL_TEAM_COUNT);
  }
  return [preset.teamAPlayerIds, preset.teamBPlayerIds];
}

/**
 * Letter assignment for every eligible player. Players the partitions do not
 * mention — and ids no longer on the unlocked roster — end up "none".
 */
export function assignmentsFromPartitions(
  partitions: number[][],
  eligiblePlayerIds: Iterable<number>,
): Record<number, BasketballTeamChoice> {
  const eligible = new Set(eligiblePlayerIds);
  const assignments: Record<number, BasketballTeamChoice> = {};
  for (const id of eligible) {
    assignments[id] = "none";
  }
  partitions.slice(0, MAX_BASKETBALL_TEAM_COUNT).forEach((playerIds, index) => {
    const letter = ALL_BASKETBALL_TEAM_LETTERS[index]!;
    for (const id of playerIds) {
      if (eligible.has(id)) {
        assignments[id] = letter;
      }
    }
  });
  return assignments;
}

/** Player ids on `letter`, in the order `playerIds` were given. */
export function rosterForTeamLetter(
  playerIds: number[],
  assignments: BasketballTeamAssignments,
  letter: BasketballTeamLetter,
): number[] {
  return playerIds.filter((playerId) => assignments[playerId] === letter);
}

/**
 * Drop assignments to teams that no longer exist after the count shrinks (a
 * 6-team lineup narrowed to 3 leaves nobody stranded on an invisible Team F).
 */
export function assignmentsClampedToTeamCount(
  assignments: BasketballTeamAssignments,
  count: number,
): Record<number, BasketballTeamChoice> {
  const active = new Set<BasketballTeamChoice>(basketballTeamLetters(count));
  const next: Record<number, BasketballTeamChoice> = {};
  for (const [playerId, team] of Object.entries(assignments)) {
    next[Number(playerId)] = team && active.has(team) ? team : "none";
  }
  return next;
}

/**
 * Keep a matchup usable for `count` teams: both letters in play and distinct.
 * Falls back to the first two letters rather than reporting an error, so
 * shrinking the team count never leaves the round form unsubmittable.
 */
export function normalizeBasketballMatchup(
  matchup: BasketballMatchup,
  count: number,
): BasketballMatchup {
  const letters = basketballTeamLetters(count);
  const home = letters.includes(matchup.home) ? matchup.home : letters[0]!;
  const away =
    letters.includes(matchup.away) && matchup.away !== home
      ? matchup.away
      : letters.find((letter) => letter !== home)!;
  return { home, away };
}

/**
 * Point one side of the matchup at `letter`. Choosing the team already on the
 * other side swaps the two rather than bumping it to an unrelated team.
 */
export function basketballMatchupWithSide(
  matchup: BasketballMatchup,
  side: "home" | "away",
  letter: BasketballTeamLetter,
  count: number,
): BasketballMatchup {
  const next: BasketballMatchup =
    side === "home"
      ? {
          home: letter,
          away: letter === matchup.away ? matchup.home : matchup.away,
        }
      : {
          home: letter === matchup.home ? matchup.away : matchup.home,
          away: letter,
        };
  return normalizeBasketballMatchup(next, count);
}

/** Rosters for the two teams playing, plus everyone sitting the round out. */
export function basketballMatchupRosters(
  playerIds: number[],
  assignments: BasketballTeamAssignments,
  matchup: BasketballMatchup,
): { teamAPlayerIds: number[]; teamBPlayerIds: number[]; sidelinedPlayerIds: number[] } {
  const teamAPlayerIds = rosterForTeamLetter(
    playerIds,
    assignments,
    matchup.home,
  );
  const teamBPlayerIds = rosterForTeamLetter(
    playerIds,
    assignments,
    matchup.away,
  );
  const playing = new Set([...teamAPlayerIds, ...teamBPlayerIds]);
  const sidelinedPlayerIds = playerIds.filter(
    (playerId) =>
      !playing.has(playerId) &&
      assignments[playerId] != null &&
      assignments[playerId] !== "none",
  );
  return { teamAPlayerIds, teamBPlayerIds, sidelinedPlayerIds };
}
