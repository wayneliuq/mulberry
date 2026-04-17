-- Basketball uses a fixed point_basis of 1; ledger magnitude is controlled in app code.
update public.games
set point_basis = 1
where game_type_id = 'basketball'
  and point_basis is distinct from 1;
