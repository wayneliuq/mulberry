import { describe, expect, it } from "vitest";

/** Mirrors admin-write FIFO cap for basketball team presets. */
export const MAX_BASKETBALL_TEAM_PRESETS = 10;

export function basketballTeamPresetIdsAfterFifo<T extends { id: string }>(
  rowsNewestFirst: T[],
): { kept: T[]; deletedIds: string[] } {
  const kept = rowsNewestFirst.slice(0, MAX_BASKETBALL_TEAM_PRESETS);
  const deletedIds = rowsNewestFirst
    .slice(MAX_BASKETBALL_TEAM_PRESETS)
    .map((row) => row.id);
  return { kept, deletedIds };
}

describe("basketballTeamPresetFifo", () => {
  it("keeps the 10 newest presets and deletes older rows", () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      id: `preset-${index}`,
      createdAt: index,
    })).reverse();

    const { kept, deletedIds } = basketballTeamPresetIdsAfterFifo(rows);

    expect(kept).toHaveLength(10);
    expect(kept[0]?.id).toBe("preset-10");
    expect(deletedIds).toEqual(["preset-0"]);
  });
});
