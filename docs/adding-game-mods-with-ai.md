# Adding New Game Types With Agentic AI

Use this prompt pattern when asking an AI agent to add a new game type to Mulberry.

## Prompt Template

```text
Add a new game type to Mulberry called "<GAME TYPE NAME>".

Follow `docs/rules.md`.
Preserve the existing architecture:
- public reads from Supabase
- admin writes through `supabase/functions/admin-write`
- shared game-type logic under `src/features/game-types`
- UI integration through the existing `Games` and `Game View` flows

Requirements for this game type:
- round input fields: <describe fields>
- scoring rules: <describe exact rules>
- zero-sum behavior: <describe how totals balance>
- round summary text: <describe desired summary>

Implementation requirements:
- add a dedicated game-type module in `src/features/game-types/`
- register it in `src/features/game-types/index.ts`
- integrate its round form into `src/routes/GameViewPage.tsx`
- ensure the backend `admin-write` flow can persist its rounds safely
- add unit tests with hand-worked examples
- keep existing game types working
- do not redesign unrelated pages

Before editing, inspect the existing Texas Hold'em and Fight the Landlord implementations and match their patterns.
After changes, run build and tests and report any manual Supabase deployment steps.
```

## What The AI Should Usually Touch

- `src/features/game-types/types.ts`
- `src/features/game-types/index.ts`
- `src/features/game-types/<newGameType>.ts`
- `src/features/game-types/<newGameType>.test.ts`
- `src/routes/GameViewPage.tsx`
- `supabase/functions/admin-write/index.ts`
- optionally `src/lib/api/types.ts` if the history or UI shape changes

## Rules To Repeat In The Prompt

- The new game type must fit the existing shared game-type architecture.
- Round results must remain reproducible from stored history.
- If the UI computes round entries client-side, the backend must still validate and persist safely.
- New logic must include hand-worked tests.
- Existing Texas Hold'em and Fight the Landlord behavior must not regress.

## Good Prompt Add-Ons

- Include 2-4 worked scoring examples.
- State whether locked players are excluded.
- State whether all unlocked players must appear in each round.
- State how ties, remainders, or uneven distributions should work (decimal splits are supported; see `docs/rules.md`).
- State the exact text/format you want in round history.
