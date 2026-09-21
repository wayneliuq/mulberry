-- Basketball point deltas are `LEDGER_SCALE * (ordinal_after - ordinal_before)`,
-- an irrational-valued quantity computed in IEEE-754 doubles. numeric(10,2)
-- quantizes each round to cents, and cumulative totals must stay in exactly the
-- same order as OpenSkill ordinals, so per-round quantization can reverse a
-- near-tie on the leaderboard.
--
-- double precision (not a wider numeric) is what actually guarantees this:
-- a JS number round-trips through float8 bit-for-bit, so the stored value IS
-- the computed value and stored ordering IS computed ordering. Any numeric(p,s)
-- still rounds at the s-th decimal and only makes the failure rarer.
-- Display code rounds to 2dp; nothing downstream relies on exact decimals.

-- point_delta is referenced by these views, so they must be dropped before the
-- column type can change (same dance as 20260307110000_point_delta_decimal).
drop view if exists public.game_point_totals;
drop view if exists public.player_points_leaderboard;
drop view if exists public.family_points_leaderboard;

alter table public.round_entries
  alter column point_delta type double precision;

-- Recreated unchanged; point_total / total_points follow the column type.
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
