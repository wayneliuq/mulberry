-- family_points_leaderboard.member_count counted joined rows, not people.
--
-- The view fans out over two left joins: families -> players -> round_entries.
-- After the second join a family with 3 players and 1,299 round entries has
-- 1,299 rows in the group, and `count(p.id)` counts every one of them. Family
-- Lai reported 1,299 members instead of 3; every family with recorded rounds
-- was wrong by roughly its round-entry count.
--
-- `count(distinct p.id)` collapses the fan-out back to people. The sibling
-- aggregates are left alone on purpose: total_points/rounds_won/rounds_lost are
-- per-round-entry quantities, and each round_entries row joins exactly one
-- player, so they never fanned out and are already correct.
--
-- The old `p.family_id = f.id` half of the filter was redundant -- the LEFT
-- JOIN already constrains it -- and is dropped. `p.is_active` is kept, so
-- member_count stays a count of active members; for a family with no players
-- p.is_active is NULL, the filter rejects the row, and the count is 0.
--
-- Replaced in place rather than dropped: the column list, order and types are
-- unchanged (count returns bigint either way), so CREATE OR REPLACE is legal
-- and no dependent object has to be rebuilt.

create or replace view public.family_points_leaderboard as
select
  f.id as family_id,
  f.name as family_name,
  count(distinct p.id) filter (where p.is_active) as member_count,
  coalesce(sum(re.point_delta), 0) as total_points,
  count(*) filter (where re.point_delta > 0) as rounds_won,
  count(*) filter (where re.point_delta < 0) as rounds_lost
from public.families f
left join public.players p
  on p.family_id = f.id
left join public.round_entries re
  on re.player_id = p.id
group by f.id, f.name;
