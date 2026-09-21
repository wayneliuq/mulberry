import { describe, expect, it } from "vitest";
import { MAX_BASKETBALL_LINEUPS_PER_GAME } from "./basketballLineups";

export function basketballTeamPresetIdsAfterFifo<T extends { id: string }>(
  rowsNewestFirst: T[],
): { kept: T[]; deletedIds: string[] } {
  const kept = rowsNewestFirst.slice(0, MAX_BASKETBALL_LINEUPS_PER_GAME);
  const deletedIds = rowsNewestFirst
    .slice(MAX_BASKETBALL_LINEUPS_PER_GAME)
    .map((row) => row.id);
  return { kept, deletedIds };
}

describe("basketballTeamPresetFifo", () => {
  it("keeps every single-letter lineup and deletes older rows", () => {
    const rows = Array.from(
      { length: MAX_BASKETBALL_LINEUPS_PER_GAME + 1 },
      (_, index) => ({ id: `preset-${index}`, createdAt: index }),
    ).reverse();

    const { kept, deletedIds } = basketballTeamPresetIdsAfterFifo(rows);

    expect(kept).toHaveLength(MAX_BASKETBALL_LINEUPS_PER_GAME);
    expect(kept[0]?.id).toBe(`preset-${MAX_BASKETBALL_LINEUPS_PER_GAME}`);
    expect(deletedIds).toEqual(["preset-0"]);
  });
});
