import { SELECT_ALL_PAGE_SIZE, selectAll } from "./selectAll";

function makeRows(n: number, offset = 0): Array<{ id: number }> {
  return Array.from({ length: n }, (_, i) => ({ id: offset + i }));
}

describe("selectAll", () => {
  it("returns a single page when row count is under the cap", async () => {
    const fetchPage = vi.fn(async () => ({ data: makeRows(3), error: null }));
    const { data, error } = await selectAll(fetchPage);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, SELECT_ALL_PAGE_SIZE - 1);
  });

  it("pages until a short page is returned", async () => {
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: makeRows(SELECT_ALL_PAGE_SIZE, 0), error: null };
      if (from === SELECT_ALL_PAGE_SIZE)
        return { data: makeRows(SELECT_ALL_PAGE_SIZE, SELECT_ALL_PAGE_SIZE), error: null };
      return { data: makeRows(7, 2 * SELECT_ALL_PAGE_SIZE), error: null };
    });

    const { data, error } = await selectAll(fetchPage);

    expect(error).toBeNull();
    expect(data).toHaveLength(2 * SELECT_ALL_PAGE_SIZE + 7);
    expect(data[0]).toEqual({ id: 0 });
    expect(data.at(-1)).toEqual({ id: 2 * SELECT_ALL_PAGE_SIZE + 6 });
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, SELECT_ALL_PAGE_SIZE - 1);
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      SELECT_ALL_PAGE_SIZE,
      2 * SELECT_ALL_PAGE_SIZE - 1,
    );
    expect(fetchPage).toHaveBeenNthCalledWith(
      3,
      2 * SELECT_ALL_PAGE_SIZE,
      3 * SELECT_ALL_PAGE_SIZE - 1,
    );
  });

  it("stops on an exactly-full final page after one extra empty fetch", async () => {
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: makeRows(SELECT_ALL_PAGE_SIZE, 0), error: null };
      return { data: [] as Array<{ id: number }>, error: null };
    });

    const { data, error } = await selectAll(fetchPage);

    expect(error).toBeNull();
    expect(data).toHaveLength(SELECT_ALL_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("treats null data as an empty terminating page", async () => {
    const fetchPage = vi.fn(async () => ({ data: null, error: null }));
    const { data, error } = await selectAll(fetchPage);

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("returns the accumulated rows alongside the error when a page fails", async () => {
    const failure = {
      message: "boom",
      details: "",
      hint: "",
      code: "500",
      name: "PostgrestError",
    };
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: makeRows(SELECT_ALL_PAGE_SIZE, 0), error: null };
      return { data: null, error: failure };
    });

    const { data, error } = await selectAll(fetchPage);

    expect(error).toBe(failure);
    expect(data).toHaveLength(SELECT_ALL_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
