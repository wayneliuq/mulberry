-- Ghost player / score-neutral-hidden flag
alter table public.players
  add column if not exists is_score_neutral_hidden boolean not null default false;

