#!/usr/bin/env python3
"""
Backfill historical basketball games into Season 1.

Creates games, game_players, rounds, and round_entries for 4 historical dates.
Each round's point deltas are computed using the same Weng-Lin Plackett-Luce
openskill algorithm as the frontend (DEFAULT_BASKETBALL_LEDGER_SCALE = 7).

Usage:
    python3 scripts/backfill-season1.py          # dry run (prints SQL)
    python3 scripts/backfill-season1.py --execute  # actually runs SQL
"""

import subprocess
import json
import sys
from datetime import datetime, timedelta, timezone

from openskill.models.weng_lin.plackett_luce import PlackettLuce

# ── Constants ──────────────────────────────────────────────────────────
SEASON_1_ID = 1
LEDGER_SCALE = 7
Pacific = timezone(timedelta(hours=-7))  # PDT

model = PlackettLuce()

# ── Scoring engine (mirrors src/features/game-types/basketball.ts) ────

def rating():
    return model.rating()

def ordinal(r):
    return r.ordinal()

def round2(value):
    return round(value * 100) / 100

def calculate_round(prior_matches, team_a_ids, team_b_ids, score_a, score_b):
    """Compute point deltas for one basketball round. Returns {player_id: delta}."""
    ratings = {}
    for match in prior_matches:
        apply_match(ratings, match)

    all_ids = team_a_ids + team_b_ids
    before_ord = {pid: ordinal(ratings.get(pid, rating())) for pid in all_ids}

    apply_match(ratings, {
        'teamAPlayerIds': team_a_ids,
        'teamBPlayerIds': team_b_ids,
        'scoreTeamA': score_a,
        'scoreTeamB': score_b,
    })

    raw_deltas = []
    for pid in all_ids:
        after = ordinal(ratings[pid])
        before = before_ord[pid]
        raw_deltas.append(round2((after - before) * LEDGER_SCALE))

    n = len(raw_deltas)
    mean_adj = round2(sum(raw_deltas) / n) if n > 0 else 0
    centered = [round2(d - mean_adj) for d in raw_deltas]
    sum_centered = round2(sum(centered))
    fix = round2(-sum_centered)
    final = [round2(centered[0] + fix)] + centered[1:]

    return dict(zip(all_ids, final))

def apply_match(ratings, match):
    """Apply a match result to the ratings map (mutates in place)."""
    team_a = [ratings.get(pid, rating()) for pid in match['teamAPlayerIds']]
    team_b = [ratings.get(pid, rating()) for pid in match['teamBPlayerIds']]
    result = model.rate([team_a, team_b], scores=[match['scoreTeamA'], match['scoreTeamB']])
    rated_a, rated_b = result
    for i, pid in enumerate(match['teamAPlayerIds']):
        ratings[pid] = rated_a[i]
    for i, pid in enumerate(match['teamBPlayerIds']):
        ratings[pid] = rated_b[i]

# ── Player name → ID mapping ───────────────────────────────────────────

PLAYER_IDS = {
    'wayne': 9, 'lillian': 10, 'ray': 11, 'chulian': 12,
    'sam chan': 18, 'fei': 23, 'marco': 30, 'kyle': 31,
    'luke savage': 32, 'sam cijin': 29, 'oliver': 38,
    'match': 39, 'spencer': 40, 'luke y': 41, 'paul': 52,
    'panda': 43, 'angel': 45, 'joe': 46, 'juan': 55,
    'ahbi': 57, 'scott': 28, 'ghost of cc': 64,
    'ralph': 70, 'jesus': 69, 'jason': 73,
}

def pid(name):
    """Resolve player name to DB id."""
    key = name.lower().strip()
    if key not in PLAYER_IDS:
        raise ValueError(f"Unknown player: {name}")
    return PLAYER_IDS[key]

# ── Game data ──────────────────────────────────────────────────────────
# Each game: (display_name, created_at_iso, rounds)
# Each round: (team_a_names, score_a, team_b_names, score_b)

GAMES = [
    # ── June 14, 2026 (3 rounds) ──────────────────────────────────────
    {
        'name': 'Basketball on 2026-06-14',
        'created_at': '2026-06-14T20:00:00-07:00',
        'rounds': [
            (['wayne', 'ray', 'match', 'chulian', 'spencer', 'lillian'], 16,
             ['sam cijin', 'joe', 'jason', 'juan', 'angel', 'luke y'], 14),
            (['angel', 'jason', 'joe', 'luke y'], 11,
             ['wayne', 'match', 'ray', 'spencer', 'lillian', 'sam cijin'], 6),
            (['wayne', 'sam cijin', 'angel', 'spencer'], 11,
             ['ray', 'match', 'lillian', 'joe', 'jason'], 6),
        ],
    },
    # ── June 15, 2026 (16 rounds) ─────────────────────────────────────
    {
        'name': 'Basketball on 2026-06-15',
        'created_at': '2026-06-15T20:00:00-07:00',
        'rounds': [
            (['lillian', 'kyle', 'marco', 'luke y'], 7,
             ['angel', 'joe', 'juan', 'spencer'], 5),
            (['angel', 'joe', 'juan', 'spencer'], 7,
             ['lillian', 'kyle', 'marco', 'luke y'], 5),
            (['wayne', 'chulian', 'spencer', 'ray'], 7,
             ['panda', 'ralph', 'jason'], 6),
            (['wayne', 'ray', 'chulian', 'match'], 7,
             ['panda', 'ralph', 'jesus'], 2),
            (['angel', 'joe', 'juan', 'spencer'], 7,
             ['wayne', 'chulian', 'ray', 'match'], 6),
            (['lillian', 'marco', 'kyle', 'luke y'], 6,
             ['panda', 'ralph', 'jesus'], 0),
            (['juan', 'angel', 'joe', 'spencer'], 7,
             ['panda', 'ralph', 'jason'], 6),
            (['wayne', 'ray', 'chulian', 'match'], 16,
             ['marco', 'kyle', 'luke y', 'lillian'], 15),
            (['lillian', 'marco', 'kyle', 'ghost of cc'], 7,
             ['panda', 'ralph', 'jesus'], 4),
            (['wayne', 'ray', 'chulian', 'match'], 7,
             ['angel', 'joe', 'jason', 'spencer'], 3),
            (['angel', 'joe', 'spencer', 'jason'], 7,
             ['lillian', 'kyle', 'marco', 'ghost of cc'], 3),
            (['wayne', 'ray', 'match', 'chulian'], 7,
             ['ralph', 'jesus', 'panda'], 2),
            (['panda', 'jesus', 'ralph'], 8,
             ['angel', 'joe', 'jason', 'spencer'], 0),
            (['chulian', 'ray', 'match', 'wayne'], 7,
             ['ghost of cc', 'lillian', 'marco', 'kyle'], 0),
            (['kyle', 'marco', 'chulian'], 7,
             ['angel', 'joe', 'jason'], 2),
            (['wayne', 'match', 'ray'], 7,
             ['panda', 'ralph', 'jesus'], 6),
        ],
    },
    # ── June 17, 2026 (1 round) ───────────────────────────────────────
    {
        'name': 'Basketball on 2026-06-17',
        'created_at': '2026-06-17T20:00:00-07:00',
        'rounds': [
            (['angel', 'ray', 'joe', 'luke y'], 14,
             ['wayne', 'panda', 'jason', 'juan'], 12),
        ],
    },
    # ── June 20, 2026 (9 rounds) ──────────────────────────────────────
    {
        'name': 'Basketball on 2026-06-20',
        'created_at': '2026-06-20T20:00:00-07:00',
        'rounds': [
            (['wayne', 'ray', 'lillian', 'paul', 'sam chan', 'sam cijin'], 11,
             ['kyle', 'panda', 'ahbi', 'juan', 'scott'], 7),
            (['kyle', 'panda', 'juan', 'luke y'], 11,
             ['wayne', 'lillian', 'paul', 'ray', 'sam cijin'], 9),
            (['wayne', 'lillian', 'kyle', 'ahbi', 'scott', 'panda'], 12,
             ['ray', 'juan', 'luke y', 'sam cijin', 'marco'], 10),
            (['wayne', 'lillian', 'scott', 'ray', 'kyle', 'ahbi'], 11,
             ['marco', 'panda', 'luke y', 'juan', 'sam cijin'], 6),
            (['kyle', 'ahbi', 'panda'], 7,
             ['sam cijin', 'sam chan', 'fei'], 3),
            (['scott', 'luke savage', 'marco'], 7,
             ['wayne', 'lillian', 'ray'], 5),
            (['panda', 'ahbi', 'kyle'], 7,
             ['marco', 'luke savage', 'scott'], 6),
            (['sam cijin', 'fei', 'sam chan'], 7,
             ['wayne', 'ray', 'lillian'], 4),
            (['wayne', 'oliver', 'fei', 'sam chan', 'sam cijin'], 11,
             ['ray', 'lillian', 'marco', 'luke savage', 'scott'], 9),
        ],
    },
]

# ── SQL generation ─────────────────────────────────────────────────────

def generate_sql(execute=False):
    """Generate and optionally execute SQL for all games."""
    all_sql = []

    # ── Phase 1: Compute ALL deltas with a single ratings map ────────
    # Ratings carry across ALL games in the season (same as the frontend's
    # priorBasketballMatchesFromSeasonHistory replay).
    global_prior_matches = []  # All matches in chronological order

    # Per-game data for SQL generation
    games_sql_data = []

    for game in GAMES:
        game_name = game['name']
        created_at = game['created_at']
        rounds = game['rounds']

        # Collect all unique player IDs for this game
        all_player_ids = set()
        for team_a_names, _, team_b_names, _ in rounds:
            for name in team_a_names + team_b_names:
                all_player_ids.add(pid(name))
        all_player_ids = sorted(all_player_ids)

        # Compute deltas using global ratings (replays ALL prior matches)
        rounds_with_deltas = []
        for round_idx, (team_a_names, score_a, team_b_names, score_b) in enumerate(rounds):
            team_a_ids = [pid(n) for n in team_a_names]
            team_b_ids = [pid(n) for n in team_b_names]

            deltas = calculate_round(global_prior_matches, team_a_ids, team_b_ids, score_a, score_b)

            global_prior_matches.append({
                'teamAPlayerIds': team_a_ids,
                'teamBPlayerIds': team_b_ids,
                'scoreTeamA': score_a,
                'scoreTeamB': score_b,
            })

            rounds_with_deltas.append((round_idx, team_a_names, team_b_names, score_a, score_b, deltas))

        games_sql_data.append((game_name, created_at, all_player_ids, rounds_with_deltas))

    # ── Phase 2: Generate SQL ─────────────────────────────────────────
    for game_name, created_at, all_player_ids, rounds_with_deltas in games_sql_data:
        all_sql.append(f"""
-- ═══ {game_name} ═══
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
  VALUES (gen_random_uuid(), 'basketball', '{game_name}', 1, 0, 'open', '{created_at}'::timestamptz, '{created_at}'::timestamptz)
  RETURNING id INTO v_game_id;

  -- Link players to game
""")

        for i, p_id in enumerate(all_player_ids):
            all_sql.append(f"  INSERT INTO game_players (id, game_id, player_id, join_order, created_at, updated_at)\n"
                          f"  VALUES (gen_random_uuid(), v_game_id, {p_id}, {i+1}, '{created_at}'::timestamptz, '{created_at}'::timestamptz);\n")

        for round_idx, team_a_names, team_b_names, score_a, score_b, deltas in rounds_with_deltas:
            team_a_ids = [pid(n) for n in team_a_names]
            team_b_ids = [pid(n) for n in team_b_names]
            round_num = round_idx + 1

            metadata = json.dumps({
                'mode': 'basketball',
                'teamAPlayerIds': team_a_ids,
                'teamBPlayerIds': team_b_ids,
                'scoreTeamA': score_a,
                'scoreTeamB': score_b,
                'basketballLedgerScale': LEDGER_SCALE,
            })

            settings_snapshot = json.dumps({
                'pointBasis': 1,
                'moneyPerPointCents': 0,
                'metadata': json.loads(metadata),
            })

            summary_parts = []
            for p_id in sorted(deltas.keys()):
                d = deltas[p_id]
                sign = '+' if d > 0 else ''
                summary_parts.append(f"{p_id} {sign}{d}")
            summary = f"Team A {score_a}–{score_b} Team B · {', '.join(summary_parts)}"

            all_sql.append(f"  -- Round {round_num}: A {team_a_names} {score_a} vs {score_b} B {team_b_names}\n")
            all_sql.append(f"  v_round_num := {round_num};\n")
            all_sql.append(f"  v_metadata := '{settings_snapshot}'::jsonb;\n")

            all_sql.append(f"""
  INSERT INTO rounds (id, game_id, round_number, game_type_id, basketball_season_id, settings_snapshot, summary_text, created_at, updated_at)
  VALUES (gen_random_uuid(), v_game_id, v_round_num, 'basketball', {SEASON_1_ID}, v_metadata, '{summary.replace("'", "''")}', '{created_at}'::timestamptz, '{created_at}'::timestamptz)
  RETURNING id INTO v_round_id;
""")

            for p_id in all_player_ids:
                if p_id in deltas:
                    delta = deltas[p_id]
                    all_sql.append(f"""
  SELECT id INTO v_gp FROM game_players WHERE game_id = v_game_id AND player_id = {p_id};
  INSERT INTO round_entries (id, round_id, game_id, game_player_id, player_id, point_delta, metadata, created_at)
  VALUES (gen_random_uuid(), v_round_id, v_game_id, v_gp.id, {p_id}, {delta}, '{{}}'::jsonb, '{created_at}'::timestamptz);
""")

        all_sql.append("END $$;\n")

    return '\n'.join(all_sql)


def main():
    execute = '--execute' in sys.argv
    sql = generate_sql(execute=execute)

    if not execute:
        # Write to file for review
        output_path = '/Users/qiangliu/Development/mulberry/scripts/backfill-season1.sql'
        with open(output_path, 'w') as f:
            f.write(sql)
        print(f"SQL written to {output_path}")
        print(f"Preview (first 2000 chars):")
        print(sql[:2000])
        print(f"\n... ({len(sql)} total chars)")
        print(f"\nTo execute: python3 scripts/backfill-season1.py --execute")
    else:
        # Write SQL to temp file and execute via supabase CLI
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            f.write(sql)
            tmp_path = f.name
        print(f"Executing SQL from {tmp_path}...")
        result = subprocess.run(
            ['supabase', 'db', 'query', '--linked', '-f', tmp_path],
            capture_output=True, text=True, cwd='/Users/qiangliu/Development/mulberry'
        )
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        print("Exit code:", result.returncode)

if __name__ == '__main__':
    main()
