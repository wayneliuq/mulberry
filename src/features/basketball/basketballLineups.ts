/**
 * Lineup IDs for picked teams.
 *
 * Every "Pick teams" run appends a lineup to the current game. The database
 * stamps it with a per-game `label_number` allocated as `max(label_number) + 1`
 * and kept unique by `unique (game_id, label_number)`, so the numbers are
 * monotonic per game and never reused — even after older rows are pruned.
 *
 * The UI shows that number as a letter so a lineup can be named out loud ("go
 * back to lineup C") instead of described by when it was picked. Letters run
 * A–Z and then widen to AA, AB, … rather than wrapping, so the 27th lineup of a
 * game never reuses an earlier lineup's ID.
 */

import {
  assignmentsFromPartitions,
  basketballPresetPartitions,
  clampBasketballTeamCount,
  type BasketballTeamChoice,
} from "./basketballTeams";

const ALPHABET_SIZE = 26;
const LETTER_A_CODE = "A".charCodeAt(0);

/**
 * How many lineups a game keeps. Mirrors the FIFO cap the admin-write function
 * enforces on `basketball_team_presets`; 26 keeps every single-letter lineup
 * reachable for a whole game.
 */
export const MAX_BASKETBALL_LINEUPS_PER_GAME = ALPHABET_SIZE;

/**
 * Bijective base-26 ("spreadsheet column") ID for a label number:
 * 1 -> A, 26 -> Z, 27 -> AA, 53 -> BA.
 *
 * Label numbers come from a `>= 1` integer column, so anything below 1 is
 * clamped rather than reported — a lineup pill always has something to show.
 */
export function basketballLineupId(labelNumber: number): string {
  let remaining = Number.isFinite(labelNumber)
    ? Math.max(1, Math.trunc(labelNumber))
    : 1;
  let id = "";
  while (remaining > 0) {
    const index = (remaining - 1) % ALPHABET_SIZE;
    id = String.fromCharCode(LETTER_A_CODE + index) + id;
    remaining = Math.floor((remaining - 1) / ALPHABET_SIZE);
  }
  return id;
}

export type BasketballLineupPresetLike = {
  id: string;
  labelNumber: number;
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  teams?: number[][] | null;
  createdAt: string;
};

export type BasketballLineup<T extends BasketballLineupPresetLike> = {
  /** Letter shown to the user, unique within the game. */
  lineupId: string;
  /** Row id of the stored preset the lineup came from. */
  presetId: string;
  /** How many teams this lineup was picked into (2–6). */
  teamCount: number;
  preset: T;
};

/**
 * The game's lineups in pick order (A first), so the letters read left to
 * right. Distinct label numbers always produce distinct letters; if a game
 * somehow surfaces two rows with the same label number, the later one is
 * suffixed rather than shadowing the earlier one.
 */
export function basketballLineups<T extends BasketballLineupPresetLike>(
  presets: readonly T[],
): BasketballLineup<T>[] {
  const ordered = [...presets].sort(
    (a, b) =>
      a.labelNumber - b.labelNumber ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );

  const usedIds = new Set<string>();
  return ordered.map((preset) => {
    const base = basketballLineupId(preset.labelNumber);
    let lineupId = base;
    for (let suffix = 2; usedIds.has(lineupId); suffix += 1) {
      lineupId = `${base} (${suffix})`;
    }
    usedIds.add(lineupId);
    return {
      lineupId,
      presetId: preset.id,
      teamCount: basketballPresetPartitions(preset).length,
      preset,
    };
  });
}

export type BasketballLineupApplication = {
  /** Team count the picker resizes to, matching what was saved. */
  teamCount: number;
  assignments: Record<number, BasketballTeamChoice>;
};

/**
 * Restore a lineup onto the current roster. A lineup carries its whole split,
 * so every partition comes back (not just the two that played) and the team
 * count follows what was saved — applying a 5-team lineup while the picker
 * shows 2 teams widens it back to 5.
 */
export function basketballLineupApplication(
  preset: BasketballLineupPresetLike,
  eligiblePlayerIds: Iterable<number>,
): BasketballLineupApplication {
  const partitions = basketballPresetPartitions(preset);
  return {
    teamCount: clampBasketballTeamCount(partitions.length),
    assignments: assignmentsFromPartitions(partitions, eligiblePlayerIds),
  };
}
