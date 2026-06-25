create table if not exists public.basketball_team_presets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  label_number integer not null check (label_number >= 1),
  team_a_player_ids bigint[] not null,
  team_b_player_ids bigint[] not null,
  team_a_win_prob numeric(5, 4) check (
    team_a_win_prob is null
    or (team_a_win_prob >= 0 and team_a_win_prob <= 1)
  ),
  created_at timestamptz not null default timezone('utc', now()),
  unique (game_id, label_number),
  check (cardinality(team_a_player_ids) >= 1 and cardinality(team_b_player_ids) >= 1)
);

create index if not exists basketball_team_presets_game_created_idx
  on public.basketball_team_presets (game_id, created_at desc);

alter table public.basketball_team_presets enable row level security;

create policy "public_read_basketball_team_presets"
  on public.basketball_team_presets
  for select
  to anon, authenticated
  using (true);
