-- Reverts 20260921010000_family_member_count_distinct: restores the row-counting
-- member_count that 20260921000000_point_delta_precision left in place.
-- Only useful if something downstream turns out to depend on the inflated
-- number; the restored definition is the buggy one.

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
