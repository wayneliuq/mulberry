-- Allow decimal point values (up to 2 decimal places)
-- for per-round point deltas.
alter table public.round_entries
  alter column point_delta type numeric(10, 2);

