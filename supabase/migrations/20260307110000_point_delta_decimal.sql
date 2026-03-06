-- Allow decimal point values (up to 2 decimal places)
-- for per-round point deltas.

-- Drop views that depend on point_delta
drop view if exists public.game_point_totals;
drop view if exists public.player_points_leaderboard;
drop view if exists public.family_points_leaderboard;

-- Alter the column
alter table public.round_entries
  alter column point_delta type numeric(10, 2);

-- Recreate the views
create or replace view public.game_point_totals as
select
  gp.game_id,
  gp.player_id,
  gp.id as game_player_id,
  coalesce(sum(re.point_delta), 0) as point_total
from public.game_players gp
left join public.round_entries re
  on re.game_player_id = gp.id
group by gp.game_id, gp.player_id, gp.id;

create or replace view public.player_points_leaderboard as
select
  p.id as player_id,
  p.display_name,
  p.family_id,
  coalesce(sum(re.point_delta), 0) as total_points,
  count(*) filter (where re.point_delta > 0) as rounds_won,
  count(*) filter (where re.point_delta < 0) as rounds_lost
from public.players p
left join public.round_entries re
  on re.player_id = p.id
group by p.id, p.display_name, p.family_id;

create or replace view public.family_points_leaderboard as
select
  f.id as family_id,
  f.name as family_name,
  count(p.id) filter (where p.family_id = f.id and p.is_active) as member_count,
  coalesce(sum(re.point_delta), 0) as total_points,
  count(*) filter (where re.point_delta > 0) as rounds_won,
  count(*) filter (where re.point_delta < 0) as rounds_lost
from public.families f
left join public.players p
  on p.family_id = f.id
left join public.round_entries re
  on re.player_id = p.id
group by f.id, f.name;
