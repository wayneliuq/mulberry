-- Validates basketball seasons migration + RPCs on local Supabase.
-- Run: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f scripts/validate-basketball-seasons-db.sql

\set ON_ERROR_STOP on

begin;

do $$
declare
  season_count integer;
  active_count integer;
  col_exists boolean;
begin
  select count(*) into season_count from public.basketball_seasons;
  if season_count < 1 then
    raise exception 'FAIL: basketball_seasons empty after migration';
  end if;

  select count(*) into active_count from public.basketball_seasons where is_active = true;
  if active_count <> 1 then
    raise exception 'FAIL: expected exactly one active season, got %', active_count;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rounds'
      and column_name = 'basketball_season_id'
  ) into col_exists;
  if not col_exists then
    raise exception 'FAIL: rounds.basketball_season_id column missing';
  end if;

  raise notice 'PASS: schema + Season 1 seed (% seasons, % active)', season_count, active_count;
end $$;

-- Seed minimal basketball fixture if none exists.
do $$
declare
  g_id uuid;
  gp_a uuid;
  gp_b uuid;
  r_id uuid;
  p1 bigint;
  p2 bigint;
begin
  if exists (select 1 from public.rounds where game_type_id = 'basketball') then
    raise notice 'SKIP seed: basketball rounds already present';
    return;
  end if;

  insert into public.players (display_name) values ('SeasonTest A') returning id into p1;
  insert into public.players (display_name) values ('SeasonTest B') returning id into p2;

  insert into public.games (game_type_id, display_name, point_basis, money_per_point_cents)
  values ('basketball', 'Season Test Game', 1, 0)
  returning id into g_id;

  insert into public.game_players (game_id, player_id, join_order)
  values (g_id, p1, 1) returning id into gp_a;
  insert into public.game_players (game_id, player_id, join_order)
  values (g_id, p2, 2) returning id into gp_b;

  insert into public.rounds (
    game_id,
    round_number,
    game_type_id,
    basketball_season_id,
    settings_snapshot,
    summary_text
  )
  values (
    g_id,
    1,
    'basketball',
    1,
    jsonb_build_object(
      'pointBasis', 1,
      'moneyPerPointCents', 0,
      'metadata', jsonb_build_object(
        'mode', 'basketball',
        'teamAPlayerIds', jsonb_build_array(p1),
        'teamBPlayerIds', jsonb_build_array(p2),
        'scoreTeamA', 11,
        'scoreTeamB', 7
      )
    ),
    'Season test round'
  )
  returning id into r_id;

  insert into public.round_entries (round_id, game_id, game_player_id, player_id, point_delta, metadata)
  values
    (r_id, g_id, gp_a, p1, 5.0, '{}'::jsonb),
    (r_id, g_id, gp_b, p2, -5.0, '{}'::jsonb);

  raise notice 'PASS: seeded basketball round in Season 1';
end $$;

-- Backfill invariant: all basketball rounds must have season_id = 1 when only Season 1 exists.
do $$
declare
  orphan_count integer;
begin
  select count(*) into orphan_count
  from public.rounds
  where game_type_id = 'basketball'
    and basketball_season_id is null;

  if orphan_count > 0 then
    raise exception 'FAIL: % basketball rounds missing basketball_season_id', orphan_count;
  end if;
  raise notice 'PASS: all basketball rounds have basketball_season_id';
end $$;

-- ensure_basketball_season_active returns Season 1 while before boundary.
do $$
declare
  active_id bigint;
  s1_id bigint;
begin
  select id into s1_id from public.basketball_seasons where season_number = 1;
  select public.ensure_basketball_season_active() into active_id;
  if active_id <> s1_id then
    raise exception 'FAIL: ensure returned % expected Season 1 id %', active_id, s1_id;
  end if;
  raise notice 'PASS: ensure_basketball_season_active keeps Season 1 before boundary';
end $$;

-- Auto rollover when active season ends_at is in the past.
do $$
declare
  before_id bigint;
  after_id bigint;
  season2_num integer;
begin
  update public.basketball_seasons
  set is_active = false
  where season_number > 1;

  update public.basketball_seasons
  set is_active = true,
      ends_at = timestamptz '2000-01-01 00:00:00+00'
  where season_number = 1;

  select id into before_id from public.basketball_seasons where season_number = 1;
  select public.ensure_basketball_season_active() into after_id;

  if after_id = before_id then
    raise exception 'FAIL: ensure did not roll forward when ends_at is past';
  end if;

  select season_number into season2_num
  from public.basketball_seasons
  where id = after_id;

  if season2_num <> 2 then
    raise exception 'FAIL: auto rollover created season % not 2', season2_num;
  end if;

  raise notice 'PASS: auto rollover via ensure_basketball_season_active (new id=%)', after_id;
end $$;

-- Idempotent: second ensure call returns same active season (active ends_at in future).
do $$
declare
  first_id bigint;
  second_id bigint;
begin
  update public.basketball_seasons
  set ends_at = timestamptz '2099-01-01 00:00:00+00'
  where is_active = true;

  select public.ensure_basketball_season_active() into first_id;
  select public.ensure_basketball_season_active() into second_id;
  if first_id <> second_id then
    raise exception 'FAIL: ensure not idempotent (% vs %)', first_id, second_id;
  end if;
  raise notice 'PASS: ensure_basketball_season_active is idempotent';
end $$;

-- force_basketball_season_rollover creates Season 3 from current active Season 2.
do $$
declare
  s3_id bigint;
  active_count integer;
  s2_active boolean;
  s3_active boolean;
  s3_num integer;
begin
  select public.force_basketball_season_rollover() into s3_id;

  select is_active into s2_active from public.basketball_seasons where season_number = 2;
  select is_active into s3_active from public.basketball_seasons where id = s3_id;
  select season_number into s3_num from public.basketball_seasons where id = s3_id;

  if s2_active then
    raise exception 'FAIL: Season 2 still active after force rollover';
  end if;
  if not s3_active then
    raise exception 'FAIL: new season not active after force rollover';
  end if;
  if s3_num <> 3 then
    raise exception 'FAIL: force rollover created season % not 3', s3_num;
  end if;

  select count(*) into active_count from public.basketball_seasons where is_active = true;
  if active_count <> 1 then
    raise exception 'FAIL: expected one active season after rollover, got %', active_count;
  end if;

  raise notice 'PASS: force_basketball_season_rollover activated Season 3 (id=%)', s3_id;
end $$;

-- New basketball round must be assignable to active season (simulates admin-write path).
do $$
declare
  g_id uuid;
  gp_a uuid;
  gp_b uuid;
  active_season bigint;
  r_id uuid;
  p1 bigint;
  p2 bigint;
begin
  select public.ensure_basketball_season_active() into active_season;

  select id into g_id from public.games where game_type_id = 'basketball' limit 1;
  select player_id into p1 from public.game_players where game_id = g_id order by join_order limit 1;
  select player_id into p2 from public.game_players where game_id = g_id order by join_order offset 1 limit 1;
  select id into gp_a from public.game_players where game_id = g_id and player_id = p1;
  select id into gp_b from public.game_players where game_id = g_id and player_id = p2;

  insert into public.rounds (
    game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text
  )
  values (
    g_id, 99, 'basketball', active_season,
    jsonb_build_object(
      'pointBasis', 1,
      'moneyPerPointCents', 0,
      'metadata', jsonb_build_object(
        'mode', 'basketball',
        'teamAPlayerIds', jsonb_build_array(p1),
        'teamBPlayerIds', jsonb_build_array(p2),
        'scoreTeamA', 11,
        'scoreTeamB', 9
      )
    ),
    'Active season round'
  )
  returning id into r_id;

  insert into public.round_entries (round_id, game_id, game_player_id, player_id, point_delta, metadata)
  values
    (r_id, g_id, gp_a, p1, 3.0, '{}'::jsonb),
    (r_id, g_id, gp_b, p2, -3.0, '{}'::jsonb);

  if not exists (
    select 1 from public.rounds where id = r_id and basketball_season_id = active_season
  ) then
    raise exception 'FAIL: new round not tied to active season';
  end if;

  raise notice 'PASS: new round assigned to active season %', active_season;
end $$;

-- Season isolation: Season 1 round count unchanged; active season has its own round.
do $$
declare
  s1_rounds integer;
  active_rounds integer;
  active_season bigint;
begin
  select public.ensure_basketball_season_active() into active_season;
  select count(*) into s1_rounds from public.rounds where basketball_season_id = 1;
  select count(*) into active_rounds from public.rounds where basketball_season_id = active_season;

  if s1_rounds < 1 then
    raise exception 'FAIL: Season 1 should retain historical rounds';
  end if;
  if active_rounds < 1 then
    raise exception 'FAIL: active season should have at least one round after insert';
  end if;

  raise notice 'PASS: season isolation (Season 1: % rounds, active season %: % rounds)',
    s1_rounds, active_season, active_rounds;
end $$;

-- Unique one-active constraint: cannot insert second active season.
do $$
begin
  begin
    insert into public.basketball_seasons (
      season_number, display_name, starts_at, ends_at, is_active
    )
    values (99, 'Bad duplicate active', now(), now() + interval '1 day', true);
    raise exception 'FAIL: unique partial index did not block second active season';
  exception
    when unique_violation then
      raise notice 'PASS: one-active-season unique index enforced';
  end;
end $$;

-- RLS: anon can read seasons (matches client fetchBasketballSeasons).
do $$
declare
  readable boolean;
begin
  set local role anon;
  select exists (select 1 from public.basketball_seasons limit 1) into readable;
  reset role;
  if not readable then
    raise exception 'FAIL: anon cannot read basketball_seasons';
  end if;
  raise notice 'PASS: anon read policy on basketball_seasons';
end $$;

rollback;
