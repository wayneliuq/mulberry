-- Reserve "Deleted Player" as a display name (used for soft-deleted players in history)
alter table public.players
  add constraint players_display_name_not_deleted
  check (lower(trim(display_name)) != 'deleted player');
