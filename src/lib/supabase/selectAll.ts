import type { PostgrestError } from "@supabase/postgrest-js";

// PostgREST enforces a server-side max_rows cap (1000 by default; see
// supabase/config.toml). An unbounded .select() above that cap is silently
// truncated. Use selectAll for any query whose row count can grow without bound
// — leaderboard aggregations, round entries, settlements, etc.
export const SELECT_ALL_PAGE_SIZE = 1000;

type PageResult<TRow> = PromiseLike<{
  data: TRow[] | null;
  error: PostgrestError | null;
}>;

export async function selectAll<TRow>(
  fetchPage: (from: number, to: number) => PageResult<TRow>,
): Promise<{ data: TRow[]; error: PostgrestError | null }> {
  const collected: TRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(
      offset,
      offset + SELECT_ALL_PAGE_SIZE - 1,
    );
    if (error) {
      return { data: collected, error };
    }
    const rows = data ?? [];
    collected.push(...rows);
    if (rows.length < SELECT_ALL_PAGE_SIZE) {
      return { data: collected, error: null };
    }
    offset += SELECT_ALL_PAGE_SIZE;
  }
}
