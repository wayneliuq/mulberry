#!/usr/bin/env python3
"""
Recompute backfill round deltas with correct priors.
Replays ALL existing Season 1 rounds before computing backfill deltas.
"""
import subprocess
import json
import sys
import tempfile
from openskill.models.weng_lin.plackett_luce import PlackettLuce

model = PlackettLuce()
LEDGER_SCALE = 7
BACKFILL_GAMES = {
    'Basketball on 2026-06-14',
    'Basketball on 2026-06-15',
    'Basketball on 2026-06-17',
    'Basketball on 2026-06-20',
}

def rating(): return model.rating()
def ordinal(r): return r.ordinal()
def round2(v): return round(v * 100) / 100

def apply_match(ratings, match):
    team_a = [ratings.get(pid, rating()) for pid in match['teamAPlayerIds']]
    team_b = [ratings.get(pid, rating()) for pid in match['teamBPlayerIds']]
    result = model.rate([team_a, team_b], scores=[match['scoreTeamA'], match['scoreTeamB']])
    for i, pid in enumerate(match['teamAPlayerIds']):
        ratings[pid] = result[0][i]
    for i, pid in enumerate(match['teamBPlayerIds']):
        ratings[pid] = result[1][i]

def compute_deltas(prior_matches, team_a_ids, team_b_ids, score_a, score_b):
    ratings = {}
    for m in prior_matches:
        apply_match(ratings, m)

    all_ids = team_a_ids + team_b_ids
    before = {pid: ordinal(ratings.get(pid, rating())) for pid in all_ids}

    apply_match(ratings, {
        'teamAPlayerIds': team_a_ids,
        'teamBPlayerIds': team_b_ids,
        'scoreTeamA': score_a,
        'scoreTeamB': score_b,
    })

    raw = [round2((ordinal(ratings[pid]) - before[pid]) * LEDGER_SCALE) for pid in all_ids]
    n = len(raw)
    mean_adj = round2(sum(raw) / n)
    centered = [round2(d - mean_adj) for d in raw]
    fix = round2(-round2(sum(centered)))
    final = [round2(centered[0] + fix)] + centered[1:]
    return dict(zip(all_ids, final))

def main():
    execute = '--execute' in sys.argv

    # Fetch all Season 1 rounds in order
    result = subprocess.run(
        ['supabase', 'db', 'query', '--linked', '--output', 'json', """
        SELECT r.id as round_id, r.created_at,
               r.settings_snapshot->'metadata'->>'teamAPlayerIds' as team_a,
               r.settings_snapshot->'metadata'->>'teamBPlayerIds' as team_b,
               r.settings_snapshot->'metadata'->>'scoreTeamA' as score_a,
               r.settings_snapshot->'metadata'->>'scoreTeamB' as score_b,
               g.display_name as game_name
        FROM rounds r
        JOIN games g ON g.id = r.game_id
        WHERE r.game_type_id = 'basketball' AND r.basketball_season_id = 1
        ORDER BY r.created_at ASC, r.id ASC;
        """],
        capture_output=True, text=True,
        cwd='/Users/qiangliu/Development/mulberry'
    )

    # Parse JSON from output (skip non-JSON lines)
    for line in result.stdout.split('\n'):
        line = line.strip()
        if line.startswith('['):
            all_rounds = json.loads(line)
            break
    else:
        print("ERROR: Could not parse DB output")
        sys.exit(1)

    print(f"Fetched {len(all_rounds)} total Season 1 rounds")

    # Separate existing vs backfill
    existing = [r for r in all_rounds if r['game_name'] not in BACKFILL_GAMES]
    backfill = [r for r in all_rounds if r['game_name'] in BACKFILL_GAMES]
    print(f"Existing: {len(existing)}, Backfill: {len(backfill)}")

    # Phase 1: Replay all existing rounds into global prior matches
    prior_matches = []
    for r in existing:
        team_a = json.loads(r['team_a'])
        team_b = json.loads(r['team_b'])
        score_a = int(r['score_a'])
        score_b = int(r['score_b'])
        prior_matches.append({
            'teamAPlayerIds': team_a,
            'teamBPlayerIds': team_b,
            'scoreTeamA': score_a,
            'scoreTeamB': score_b,
        })

    print(f"Replayed {len(prior_matches)} existing rounds")

    # Phase 2: Compute correct deltas for backfill rounds
    update_sql_parts = []
    for r in backfill:
        round_id = r['round_id']
        team_a = json.loads(r['team_a'])
        team_b = json.loads(r['team_b'])
        score_a = int(r['score_a'])
        score_b = int(r['score_b'])

        deltas = compute_deltas(prior_matches, team_a, team_b, score_a, score_b)

        # Record this match for subsequent rounds
        prior_matches.append({
            'teamAPlayerIds': team_a,
            'teamBPlayerIds': team_b,
            'scoreTeamA': score_a,
            'scoreTeamB': score_b,
        })

        # Generate UPDATE SQL for each player's point_delta
        for pid, delta in deltas.items():
            update_sql_parts.append(
                f"UPDATE round_entries SET point_delta = {delta} "
                f"WHERE round_id = '{round_id}' AND player_id = {pid};"
            )

    print(f"Generated {len(update_sql_parts)} UPDATE statements")

    if not execute:
        sql = '\n'.join(update_sql_parts)
        out_path = '/Users/qiangliu/Development/mulberry/scripts/fix-backfill-deltas.sql'
        with open(out_path, 'w') as f:
            f.write(sql)
        print(f"SQL written to {out_path}")
        # Show a sample
        print("\nSample updates (first 6):")
        for line in update_sql_parts[:6]:
            print(f"  {line}")
    else:
        sql = '\n'.join(update_sql_parts)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            f.write(sql)
            tmp_path = f.name
        print(f"Executing {len(update_sql_parts)} updates...")
        result = subprocess.run(
            ['supabase', 'db', 'query', '--linked', '-f', tmp_path],
            capture_output=True, text=True,
            cwd='/Users/qiangliu/Development/mulberry'
        )
        if result.returncode == 0:
            print("Done — all backfill deltas recomputed with correct priors.")
        else:
            print(f"ERROR (exit {result.returncode}):")
            print(result.stderr)

if __name__ == '__main__':
    main()
