# Troubleshooting: Admin Edge Functions (non-2xx)

When Admin Console actions (rename player, delete player, etc.) return "Edge Function returned a non-2xx status code", use this plan to isolate the cause.

## 1. Inspect the actual error

- **Browser DevTools**: Open Network tab, trigger a rename, find the `admin-write` request. Check:
  - **Status code**: 400, 401, 403, 500?
  - **Response body**: Any JSON with `error`, `message`, or stack trace?
- **Supabase Dashboard**: Edge Functions → `admin-write` → Logs. Look for errors and stack traces around the time of the request.

## 2. Verify admin authentication

- Confirm you are logged in as admin (green pill on Games page).
- Try another admin action (e.g. create player, add players to game). If those also fail, the issue is likely:
  - Admin password incorrect or expired
  - `admin-login` / `admin-write` auth flow (e.g. `verify_admin_password` or `createVerifiedAdminClient`).

## 3. Check request payload

- In Network tab, inspect the request body for `rename_player`:
  - `action`: `"rename_player"`
  - `password`: non-empty string
  - `playerId`: positive integer (existing player ID)
  - `displayName`: non-empty string after trim
- Ensure `displayName` is not empty and is valid (e.g. no leading/trailing spaces only).

## 4. Database constraints

- **Unique display name**: `players_display_name_unique_active` enforces unique `lower(display_name)` for active players. Renaming to an existing name will fail.
- **Player existence**: Verify the player ID exists and `is_active = true` in `players` table.

## 5. Edge Function logs (Supabase)

- In Supabase Dashboard → Edge Functions → `admin-write` → Logs, look for:
  - `Error` or exception messages
  - Supabase client errors (e.g. from `.update()`)
- If logs show a Supabase error, note the exact message and code.

## 6. RLS and permissions

- Confirm the Edge Function uses a service role client (bypasses RLS) or that the anon/authenticated role has the right policies.
- Check `players` table RLS policies: the function must be able to `UPDATE` rows.

## 7. Local reproduction

- Run Supabase locally: `supabase start` and `supabase functions serve`.
- Reproduce the rename and watch terminal output for errors.
- Test with `curl`:

  ```bash
  curl -X POST 'http://127.0.0.1:54321/functions/v1/admin-write' \
    -H 'Content-Type: application/json' \
    -d '{"action":"rename_player","password":"YOUR_ADMIN_PASSWORD","playerId":1,"displayName":"New Name"}'
  ```

## 8. Common fixes

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| 401 / auth error | Wrong or expired password | Re-login as admin |
| 400 / validation error | Invalid payload | Check `playerId` type, `displayName` length/format |
| 500 + unique constraint | Duplicate display name | Choose a different name |
| 500 + "row not found" | Player doesn't exist or inactive | Use valid player ID |
| 500 + RLS / permission | Policy blocks update | Adjust RLS or use service role in function |

---

## Delete player

For `delete_player`, follow the same steps above. Additional checks:

- **Payload**: `action: "delete_player"`, `password`, `playerId` (positive integer).
- **Player state**: Player must exist. Delete sets `is_active = false` (soft delete).
- **curl test**:

  ```bash
  curl -X POST 'http://127.0.0.1:54321/functions/v1/admin-write' \
    -H 'Content-Type: application/json' \
    -d '{"action":"delete_player","password":"YOUR_ADMIN_PASSWORD","playerId":1}'
  ```
