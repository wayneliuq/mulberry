-- Add teams jsonb column to basketball_team_presets to support 2 to 6 team splits
alter table public.basketball_team_presets
  add column if not exists teams jsonb null;
