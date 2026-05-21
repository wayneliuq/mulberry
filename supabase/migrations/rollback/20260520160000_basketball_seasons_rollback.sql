-- ROLLBACK for 20260520160000_basketball_seasons.sql
-- Run manually only if you need to undo the seasons feature on a database that had the forward migration applied.
-- Order: revert frontend + admin-write edge function FIRST, then run this script.
--
-- WARNING: Drops season assignment on rounds. Basketball rounds keep existing rows;
-- basketball_season_id is cleared before column drop. Season rows are deleted.

begin;

drop function if exists public.force_basketball_season_rollover();
drop function if exists public.ensure_basketball_season_active();

drop policy if exists "public_read_basketball_seasons" on public.basketball_seasons;

alter table public.rounds
  drop constraint if exists rounds_basketball_season_id_fkey;

drop index if exists public.rounds_basketball_season_id_idx;

alter table public.rounds
  drop column if exists basketball_season_id;

drop trigger if exists set_basketball_seasons_updated_at on public.basketball_seasons;
drop index if exists public.basketball_seasons_one_active_idx;
drop table if exists public.basketball_seasons;

-- Remove migration history row so `supabase migration list` can re-apply forward migration later if needed.
delete from supabase_migrations.schema_migrations
where version = '20260520160000';

commit;
