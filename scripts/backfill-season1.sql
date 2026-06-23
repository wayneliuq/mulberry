
-- ═══ Basketball on 2026-06-14 ═══
DO $$
DECLARE
  v_game_id UUID;
  v_round_id UUID;
  v_gp RECORD;
  v_round_num INT := 0;
  v_metadata JSONB;
  v_entries JSONB;
  v_summary TEXT;
BEGIN
  INSERT INTO games (id, game_type_id, display_name, point_basis, money_per_point_cents, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'basketball', 'Basketball on 2026-06-14', 1, 0, 'open', '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_game_id;

  -- Link players to game

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 9, 1, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 10, 2, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 11, 3, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 12, 4, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 29, 5, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 39, 6, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 40, 7, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 41, 8, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 45, 9, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 46, 10, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 55, 11, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 73, 12, '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz);

  -- Round 1: A ['wayne', 'ray', 'match', 'chulian', 'spencer', 'lillian'] 16 vs 14 B ['sam cijin', 'joe', 'jason', 'juan', 'angel', 'luke y']

  v_round_num := 1;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 11, 39, 12, 40, 10], "teamBPlayerIds": [29, 46, 73, 55, 45, 41], "scoreTeamA": 16, "scoreTeamB": 14, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 16–14 Team B · 9 +8.25, 10 +8.25, 11 +8.25, 12 +8.25, 29 -8.25, 39 +8.25, 40 +8.25, 41 -8.25, 45 -8.25, 46 -8.25, 55 -8.25, 73 -8.25', '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, -8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, -8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, -8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, -8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, -8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -8.25, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);

  -- Round 2: A ['angel', 'jason', 'joe', 'luke y'] 11 vs 6 B ['wayne', 'match', 'ray', 'spencer', 'lillian', 'sam cijin']

  v_round_num := 2;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [45, 73, 46, 41], "teamBPlayerIds": [9, 39, 11, 40, 10, 29], "scoreTeamA": 11, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 11–6 Team B · 9 -12.85, 10 -12.85, 11 -12.85, 29 -12.85, 39 -12.85, 40 -12.85, 41 +19.28, 45 +19.26, 46 +19.28, 73 +19.28', '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, -12.85, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -12.85, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -12.85, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, -12.85, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, -12.85, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, -12.85, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, 19.28, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 19.26, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, 19.28, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, 19.28, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);

  -- Round 3: A ['wayne', 'sam cijin', 'angel', 'spencer'] 11 vs 6 B ['ray', 'match', 'lillian', 'joe', 'jason']

  v_round_num := 3;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 29, 45, 40], "teamBPlayerIds": [11, 39, 10, 46, 73], "scoreTeamA": 11, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 11–6 Team B · 9 +15.65, 10 -12.49, 11 -12.49, 29 +15.61, 39 -12.49, 40 +15.61, 45 +15.62, 46 -12.51, 73 -12.51', '2026-06-14T20:00:00-07:00'::timestamptz, '2026-06-14T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 15.65, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -12.49, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -12.49, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, 15.61, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, -12.49, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 15.61, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 15.62, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, -12.51, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -12.51, '{}'::jsonb, '2026-06-14T20:00:00-07:00'::timestamptz);

END $$;


-- ═══ Basketball on 2026-06-15 ═══
DO $$
DECLARE
  v_game_id UUID;
  v_round_id UUID;
  v_gp RECORD;
  v_round_num INT := 0;
  v_metadata JSONB;
  v_entries JSONB;
  v_summary TEXT;
BEGIN
  INSERT INTO games (id, game_type_id, display_name, point_basis, money_per_point_cents, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'basketball', 'Basketball on 2026-06-15', 1, 0, 'open', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_game_id;

  -- Link players to game

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 9, 1, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 10, 2, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 11, 3, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 12, 4, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 30, 5, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 31, 6, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 39, 7, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 40, 8, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 41, 9, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 43, 10, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 45, 11, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 46, 12, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 55, 13, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 64, 14, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 69, 15, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 70, 16, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 73, 17, '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 1: A ['lillian', 'kyle', 'marco', 'luke y'] 7 vs 5 B ['angel', 'joe', 'juan', 'spencer']

  v_round_num := 1;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [10, 31, 30, 41], "teamBPlayerIds": [45, 46, 55, 40], "scoreTeamA": 7, "scoreTeamB": 5, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–5 Team B · 10 +10.45, 30 +10.92, 31 +10.92, 40 -10.7, 41 +10.66, 45 -10.71, 46 -10.69, 55 -10.85', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 10.45, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, 10.92, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 10.92, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, -10.7, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, 10.66, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, -10.71, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, -10.69, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, -10.85, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 2: A ['angel', 'joe', 'juan', 'spencer'] 7 vs 5 B ['lillian', 'kyle', 'marco', 'luke y']

  v_round_num := 2;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [45, 46, 55, 40], "teamBPlayerIds": [10, 31, 30, 41], "scoreTeamA": 7, "scoreTeamB": 5, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–5 Team B · 10 -11.26, 30 -11.56, 31 -11.56, 40 +11.38, 41 -11.4, 45 +11.38, 46 +11.38, 55 +11.64', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -11.26, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -11.56, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, -11.56, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 11.38, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, -11.4, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 11.38, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, 11.38, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, 11.64, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 3: A ['wayne', 'chulian', 'spencer', 'ray'] 7 vs 6 B ['panda', 'ralph', 'jason']

  v_round_num := 3;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 12, 40, 11], "teamBPlayerIds": [43, 70, 73], "scoreTeamA": 7, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–6 Team B · 9 +4.44, 11 +4.43, 12 +4.59, 40 +4.17, 43 -5.91, 70 -5.91, 73 -5.81', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 4.44, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 4.43, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 4.59, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 4.17, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -5.91, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -5.91, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -5.81, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 4: A ['wayne', 'ray', 'chulian', 'match'] 7 vs 2 B ['panda', 'ralph', 'jesus']

  v_round_num := 4;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 11, 12, 39], "teamBPlayerIds": [43, 70, 69], "scoreTeamA": 7, "scoreTeamB": 2, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–2 Team B · 9 +4.54, 11 +4.53, 12 +4.68, 39 +4.66, 43 -6.12, 69 -6.17, 70 -6.12', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 4.54, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 4.53, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 4.68, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 4.66, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -6.12, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 69;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 69, -6.17, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -6.12, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 5: A ['angel', 'joe', 'juan', 'spencer'] 7 vs 6 B ['wayne', 'chulian', 'ray', 'match']

  v_round_num := 5;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [45, 46, 55, 40], "teamBPlayerIds": [9, 12, 11, 39], "scoreTeamA": 7, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–6 Team B · 9 -9.15, 11 -9.14, 12 -9.27, 39 -9.25, 40 +9.0, 45 +9.19, 46 +9.2, 55 +9.42', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, -9.15, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -9.14, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, -9.27, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, -9.25, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 9.0, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 9.19, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, 9.2, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, 9.42, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 6: A ['lillian', 'marco', 'kyle', 'luke y'] 6 vs 0 B ['panda', 'ralph', 'jesus']

  v_round_num := 6;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [10, 30, 31, 41], "teamBPlayerIds": [43, 70, 69], "scoreTeamA": 6, "scoreTeamB": 0, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 6–0 Team B · 10 +4.11, 30 +4.36, 31 +4.36, 41 +4.23, 43 -5.67, 69 -5.72, 70 -5.67', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 4.11, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, 4.36, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 4.36, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, 4.23, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -5.67, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 69;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 69, -5.72, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -5.67, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 7: A ['juan', 'angel', 'joe', 'spencer'] 7 vs 6 B ['panda', 'ralph', 'jason']

  v_round_num := 7;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [55, 45, 46, 40], "teamBPlayerIds": [43, 70, 73], "scoreTeamA": 7, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–6 Team B · 40 +2.48, 43 -3.41, 45 +2.55, 46 +2.55, 55 +2.65, 70 -3.41, 73 -3.41', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 2.48, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -3.41, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 2.55, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, 2.55, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, 2.65, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -3.41, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -3.41, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 8: A ['wayne', 'ray', 'chulian', 'match'] 16 vs 15 B ['marco', 'kyle', 'luke y', 'lillian']

  v_round_num := 8;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 11, 12, 39], "teamBPlayerIds": [30, 31, 41, 10], "scoreTeamA": 16, "scoreTeamB": 15, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 16–15 Team B · 9 +10.44, 10 -10.39, 11 +10.43, 12 +10.68, 30 -10.65, 31 -10.65, 39 +10.65, 41 -10.51', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 10.44, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -10.39, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 10.43, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 10.68, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -10.65, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, -10.65, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 10.65, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, -10.51, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 9: A ['lillian', 'marco', 'kyle', 'ghost of cc'] 7 vs 4 B ['panda', 'ralph', 'jesus']

  v_round_num := 9;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [10, 30, 31, 64], "teamBPlayerIds": [43, 70, 69], "scoreTeamA": 7, "scoreTeamB": 4, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–4 Team B · 10 +3.95, 30 +4.2, 31 +4.2, 43 -5.68, 64 +4.77, 69 -5.76, 70 -5.68', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 3.95, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, 4.2, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 4.2, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -5.68, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 64;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 64, 4.77, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 69;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 69, -5.76, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -5.68, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 10: A ['wayne', 'ray', 'chulian', 'match'] 7 vs 3 B ['angel', 'joe', 'jason', 'spencer']

  v_round_num := 10;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 11, 12, 39], "teamBPlayerIds": [45, 46, 73, 40], "scoreTeamA": 7, "scoreTeamB": 3, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–3 Team B · 9 +10.54, 11 +10.51, 12 +10.76, 39 +10.72, 40 -10.44, 45 -10.58, 46 -10.57, 73 -10.94', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 10.54, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 10.51, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 10.76, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 10.72, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, -10.44, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, -10.58, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, -10.57, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -10.94, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 11: A ['angel', 'joe', 'spencer', 'jason'] 7 vs 3 B ['lillian', 'kyle', 'marco', 'ghost of cc']

  v_round_num := 11;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [45, 46, 40, 73], "teamBPlayerIds": [10, 31, 30, 64], "scoreTeamA": 7, "scoreTeamB": 3, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–3 Team B · 10 -8.29, 30 -8.48, 31 -8.48, 40 +8.31, 45 +8.48, 46 +8.47, 64 -8.97, 73 +8.96', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -8.29, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -8.48, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, -8.48, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, 8.31, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 8.48, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, 8.47, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 64;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 64, -8.97, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, 8.96, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 12: A ['wayne', 'ray', 'match', 'chulian'] 7 vs 2 B ['ralph', 'jesus', 'panda']

  v_round_num := 12;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 11, 39, 12], "teamBPlayerIds": [70, 69, 43], "scoreTeamA": 7, "scoreTeamB": 2, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–2 Team B · 9 +2.26, 11 +2.22, 12 +2.3, 39 +2.29, 43 -3.01, 69 -3.05, 70 -3.01', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 2.26, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 2.22, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 2.3, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 2.29, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -3.01, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 69;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 69, -3.05, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -3.01, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 13: A ['panda', 'jesus', 'ralph'] 8 vs 0 B ['angel', 'joe', 'jason', 'spencer']

  v_round_num := 13;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [43, 69, 70], "teamBPlayerIds": [45, 46, 73, 40], "scoreTeamA": 8, "scoreTeamB": 0, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 8–0 Team B · 40 -14.67, 43 +19.86, 45 -14.93, 46 -14.91, 69 +20.37, 70 +19.87, 73 -15.59', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 40;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 40, -14.67, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, 19.86, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, -14.93, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, -14.91, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 69;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 69, 20.37, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, 19.87, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -15.59, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 14: A ['chulian', 'ray', 'match', 'wayne'] 7 vs 0 B ['ghost of cc', 'lillian', 'marco', 'kyle']

  v_round_num := 14;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [12, 11, 39, 9], "teamBPlayerIds": [64, 10, 30, 31], "scoreTeamA": 7, "scoreTeamB": 0, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–0 Team B · 9 +5.92, 10 -5.82, 11 +5.91, 12 +6.04, 30 -5.93, 31 -5.93, 39 +6.04, 64 -6.23', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 5.92, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -5.82, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 5.91, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 6.04, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -5.93, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, -5.93, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 6.04, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 64;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 64, -6.23, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 15: A ['kyle', 'marco', 'chulian'] 7 vs 2 B ['angel', 'joe', 'jason']

  v_round_num := 15;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [31, 30, 12], "teamBPlayerIds": [45, 46, 73], "scoreTeamA": 7, "scoreTeamB": 2, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–2 Team B · 12 +9.18, 30 +9.24, 31 +9.27, 45 -9.15, 46 -9.14, 73 -9.4', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 12;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 12, 9.18, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, 9.24, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 9.27, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, -9.15, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, -9.14, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -9.4, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

  -- Round 16: A ['wayne', 'match', 'ray'] 7 vs 6 B ['panda', 'ralph', 'jesus']

  v_round_num := 16;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 39, 11], "teamBPlayerIds": [43, 70, 69], "scoreTeamA": 7, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–6 Team B · 9 +8.12, 11 +8.1, 39 +8.28, 43 -8.12, 69 -8.26, 70 -8.12', '2026-06-15T20:00:00-07:00'::timestamptz, '2026-06-15T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 8.12, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 8.1, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 39;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 39, 8.28, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -8.12, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 69;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 69, -8.26, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 70;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 70, -8.12, '{}'::jsonb, '2026-06-15T20:00:00-07:00'::timestamptz);

END $$;


-- ═══ Basketball on 2026-06-17 ═══
DO $$
DECLARE
  v_game_id UUID;
  v_round_id UUID;
  v_gp RECORD;
  v_round_num INT := 0;
  v_metadata JSONB;
  v_entries JSONB;
  v_summary TEXT;
BEGIN
  INSERT INTO games (id, game_type_id, display_name, point_basis, money_per_point_cents, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'basketball', 'Basketball on 2026-06-17', 1, 0, 'open', '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_game_id;

  -- Link players to game

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 9, 1, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 11, 2, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 41, 3, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 43, 4, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 45, 5, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 46, 6, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 55, 7, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 73, 8, '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz);

  -- Round 1: A ['angel', 'ray', 'joe', 'luke y'] 14 vs 12 B ['wayne', 'panda', 'jason', 'juan']

  v_round_num := 1;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [45, 11, 46, 41], "teamBPlayerIds": [9, 43, 73, 55], "scoreTeamA": 14, "scoreTeamB": 12, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 14–12 Team B · 9 -8.52, 11 +8.57, 41 +9.52, 43 -8.9, 45 +8.64, 46 +8.59, 55 -9.12, 73 -8.78', '2026-06-17T20:00:00-07:00'::timestamptz, '2026-06-17T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, -8.52, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 8.57, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, 9.52, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -8.9, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 45;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 45, 8.64, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 46;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 46, 8.59, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, -9.12, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 73;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 73, -8.78, '{}'::jsonb, '2026-06-17T20:00:00-07:00'::timestamptz);

END $$;


-- ═══ Basketball on 2026-06-20 ═══
DO $$
DECLARE
  v_game_id UUID;
  v_round_id UUID;
  v_gp RECORD;
  v_round_num INT := 0;
  v_metadata JSONB;
  v_entries JSONB;
  v_summary TEXT;
BEGIN
  INSERT INTO games (id, game_type_id, display_name, point_basis, money_per_point_cents, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'basketball', 'Basketball on 2026-06-20', 1, 0, 'open', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_game_id;

  -- Link players to game

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 9, 1, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 10, 2, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 11, 3, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 18, 4, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 23, 5, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 28, 6, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 29, 7, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 30, 8, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 31, 9, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 32, 10, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 38, 11, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 41, 12, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 43, 13, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 52, 14, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 55, 15, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, 57, 16, '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 1: A ['wayne', 'ray', 'lillian', 'paul', 'sam chan', 'sam cijin'] 11 vs 7 B ['kyle', 'panda', 'ahbi', 'juan', 'scott']

  v_round_num := 1;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 11, 10, 52, 18, 29], "teamBPlayerIds": [31, 43, 57, 55, 28], "scoreTeamA": 11, "scoreTeamB": 7, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 11–7 Team B · 9 +2.99, 10 +3.17, 11 +3.01, 18 +4.04, 28 -4.43, 29 +3.85, 31 -4.02, 43 -4.07, 52 +4.04, 55 -4.15, 57 -4.43', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 2.99, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 3.17, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 3.01, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 18;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 18, 4.04, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 28;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 28, -4.43, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, 3.85, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, -4.02, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -4.07, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 52;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 52, 4.04, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, -4.15, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 57;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 57, -4.43, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 2: A ['kyle', 'panda', 'juan', 'luke y'] 11 vs 9 B ['wayne', 'lillian', 'paul', 'ray', 'sam cijin']

  v_round_num := 2;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [31, 43, 55, 41], "teamBPlayerIds": [9, 10, 52, 11, 29], "scoreTeamA": 11, "scoreTeamB": 9, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 11–9 Team B · 9 -11.63, 10 -12.04, 11 -11.62, 29 -13.73, 31 +15.32, 41 +16.13, 43 +15.63, 52 -14.19, 55 +16.13', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, -11.63, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -12.04, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -11.62, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, -13.73, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 15.32, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, 16.13, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, 15.63, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 52;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 52, -14.19, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, 16.13, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 3: A ['wayne', 'lillian', 'kyle', 'ahbi', 'scott', 'panda'] 12 vs 10 B ['ray', 'juan', 'luke y', 'sam cijin', 'marco']

  v_round_num := 3;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 10, 31, 57, 28, 43], "teamBPlayerIds": [11, 55, 41, 29, 30], "scoreTeamA": 12, "scoreTeamB": 10, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 12–10 Team B · 9 +4.49, 10 +4.73, 11 -5.89, 28 +6.07, 29 -6.54, 30 -6.12, 31 +4.78, 41 -6.25, 43 +4.91, 55 -6.25, 57 +6.07', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 4.49, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 4.73, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -5.89, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 28;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 28, 6.07, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, -6.54, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -6.12, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 4.78, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, -6.25, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, 4.91, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, -6.25, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 57;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 57, 6.07, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 4: A ['wayne', 'lillian', 'scott', 'ray', 'kyle', 'ahbi'] 11 vs 6 B ['marco', 'panda', 'luke y', 'juan', 'sam cijin']

  v_round_num := 4;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 10, 28, 11, 31, 57], "teamBPlayerIds": [30, 43, 41, 55, 29], "scoreTeamA": 11, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 11–6 Team B · 9 +3.05, 10 +3.2, 11 +3.05, 28 +4.12, 29 -4.33, 30 -4.07, 31 +3.23, 41 -4.15, 43 -4.07, 55 -4.15, 57 +4.12', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 3.05, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, 3.2, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, 3.05, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 28;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 28, 4.12, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, -4.33, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -4.07, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 3.23, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 41;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 41, -4.15, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, -4.07, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 55;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 55, -4.15, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 57;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 57, 4.12, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 5: A ['kyle', 'ahbi', 'panda'] 7 vs 3 B ['sam cijin', 'sam chan', 'fei']

  v_round_num := 5;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [31, 57, 43], "teamBPlayerIds": [29, 18, 23], "scoreTeamA": 7, "scoreTeamB": 3, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–3 Team B · 18 -9.59, 23 -9.67, 29 -9.14, 31 +8.71, 43 +8.95, 57 +10.74', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 18;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 18, -9.59, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 23;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 23, -9.67, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, -9.14, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 8.71, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, 8.95, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 57;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 57, 10.74, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 6: A ['scott', 'luke savage', 'marco'] 7 vs 5 B ['wayne', 'lillian', 'ray']

  v_round_num := 6;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [28, 32, 30], "teamBPlayerIds": [9, 10, 11], "scoreTeamA": 7, "scoreTeamB": 5, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–5 Team B · 9 -11.54, 10 -11.79, 11 -11.54, 28 +12.1, 30 +9.98, 32 +12.79', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, -11.54, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -11.79, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -11.54, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 28;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 28, 12.1, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, 9.98, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 32;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 32, 12.79, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 7: A ['panda', 'ahbi', 'kyle'] 7 vs 6 B ['marco', 'luke savage', 'scott']

  v_round_num := 7;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [43, 57, 31], "teamBPlayerIds": [30, 32, 28], "scoreTeamA": 7, "scoreTeamB": 6, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–6 Team B · 28 -10.54, 30 -9.56, 31 +9.52, 32 -10.83, 43 +9.76, 57 +11.65', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 28;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 28, -10.54, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -9.56, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 31;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 31, 9.52, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 32;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 32, -10.83, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 43;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 43, 9.76, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 57;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 57, 11.65, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 8: A ['sam cijin', 'fei', 'sam chan'] 7 vs 4 B ['wayne', 'ray', 'lillian']

  v_round_num := 8;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [29, 23, 18], "teamBPlayerIds": [9, 11, 10], "scoreTeamA": 7, "scoreTeamB": 4, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 7–4 Team B · 9 -12.23, 10 -12.49, 11 -12.23, 18 +12.63, 23 +12.83, 29 +11.49', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, -12.23, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -12.49, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -12.23, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 18;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 18, 12.63, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 23;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 23, 12.83, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, 11.49, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

  -- Round 9: A ['wayne', 'oliver', 'fei', 'sam chan', 'sam cijin'] 11 vs 9 B ['ray', 'lillian', 'marco', 'luke savage', 'scott']

  v_round_num := 9;

  v_metadata := '{"pointBasis": 1, "moneyPerPointCents": 0, "metadata": {"mode": "basketball", "teamAPlayerIds": [9, 38, 23, 18, 29], "teamBPlayerIds": [11, 10, 30, 32, 28], "scoreTeamA": 11, "scoreTeamB": 9, "basketballLedgerScale": 7}}'::jsonb;


  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', 1, v_metadata, 'Team A 11–9 Team B · 9 +5.4, 10 -6.52, 11 -6.39, 18 +7.16, 23 +7.27, 28 -7.26, 29 +6.56, 30 -6.62, 32 -7.45, 38 +7.85', '2026-06-20T20:00:00-07:00'::timestamptz, '2026-06-20T20:00:00-07:00'::timestamptz)
  RETURNING id INTO v_round_id;


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 9;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 9, 5.4, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 10;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 10, -6.52, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 11;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 11, -6.39, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 18;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 18, 7.16, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 23;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 23, 7.27, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 28;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 28, -7.26, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 29;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 29, 6.56, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 30;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 30, -6.62, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 32;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 32, -7.45, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);


  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = 38;
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, 38, 7.85, '{}'::jsonb, '2026-06-20T20:00:00-07:00'::timestamptz);

END $$;
