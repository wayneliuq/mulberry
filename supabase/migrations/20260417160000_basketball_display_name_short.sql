-- Align game_types label with UI (was "Basketball (OpenSkill)" on first deploy).
update public.game_types
set display_name = 'Basketball'
where id = 'basketball';
