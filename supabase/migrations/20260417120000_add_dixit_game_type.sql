insert into public.game_types (id, display_name, icon, sort_order)
values ('dixit', 'Dixit', 'meeple', 4)
on conflict (id) do update
set
  display_name = excluded.display_name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
