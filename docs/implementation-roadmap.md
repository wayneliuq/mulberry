# Mulberry Implementation Strategy and Roadmap

## Purpose of this document

This document turns `docs/plan.md` into a practical build strategy for the app.

It is written for someone with limited coding experience, so I will explain not just **what** to build, but also **why this order and architecture make sense**.

## Short recommendation

Build `mulberry` as a **mobile-first web app** with:

- a **static frontend** hosted from GitHub Pages
- a **managed backend/database** using Supabase
- a **history-first data model** where rounds and money settlements are saved as permanent records
- **derived leaderboards** that are recalculated from those records rather than edited by hand

In plain language:

- The **frontend** is what users see in the browser.
- The **backend** is the part that saves data, validates actions, and protects admin-only features.
- The **database** is the permanent storage.

This is the best fit for your goals because it stays simple, cheap, public to view, admin-protected for edits, and reliable enough for long-term tracking.

## Why I chose this strategy

### 1. GitHub alone is not enough for your requirements

Your plan says the app should be hosted for free on GitHub, but the app also needs:

- permanent data storage
- an admin login
- validated writes
- history that affects leaderboards

GitHub Pages can host the visual website, but it cannot by itself act as a proper database or secure write API.

That means the simplest realistic setup is:

- **GitHub Pages** for the website
- **Supabase** for the database, authentication, and server-side logic

This still keeps the project lightweight and very low-cost, while actually meeting the requirements.

### 2. A history-first design matches your app better than a "current totals only" design

Your app is not just a scoreboard. It is also a **record of what happened over time**:

- games are created
- players join a game
- rounds are added
- rounds may be deleted later
- money can be calculated at the end
- money calculation can also be undone later
- settings can change during a game, but only affect future rounds

Because of that, the safest design is to save the **history events** first, then compute totals from that history.

Why this matters:

- If a round is deleted, you can recompute the totals correctly.
- If game settings change midway, old rounds stay tied to the old settings.
- If a money event is undone, the leaderboard can be corrected cleanly.
- If something looks wrong later, you still have an audit trail of what happened.

### 3. Build one simple game type first, then the more specialized one

You listed two game types:

- Texas Hold'em
- Fight the Landlord (SE)

I recommend building **Texas Hold'em first**, even though it appears second in your notes.

Why:

- It is the simpler foundation.
- It exercises the core system: players, rounds, validation, history, totals, and leaderboards.
- It proves the app works before you add custom rule-heavy calculations.

Then build Fight the Landlord using the same framework. That is the moment where you confirm the game type system is truly modular.

### 4. Keep write operations server-validated, but do not overbuild distributed infrastructure

Your note mentions asynchronous workers and graceful recovery if the database update fails.

That is a good goal, but for version 1, I would avoid building a complicated multi-service worker system. That would add a lot of complexity for a private, low-traffic app.

Instead, I recommend:

- the client sends a write request
- the server validates it
- the server stores the history record
- the server updates or schedules recalculation of derived totals
- the client refreshes from the database and shows an error if the update fails

This gives you the reliability you want without turning the project into a heavy backend system.

## Recommended technical architecture

## Frontend

Recommended stack:

- **React + TypeScript + Vite**
- **React Router** for pages
- **TanStack Query** for loading and refreshing server data
- **simple mobile-first CSS**, either with Tailwind or a small custom design system

Why this frontend stack:

- React is a common choice for multi-page interactive apps.
- TypeScript catches mistakes early.
- Vite is fast and lightweight.
- TanStack Query is especially useful because your app depends on fresh server data after every admin action.

## Backend and database

Recommended stack:

- **Supabase Postgres** for the database
- **a single shared admin password**, stored as a secure hash in an `admin_settings` table
- **Row Level Security** so public users can read allowed data, but only requests with the correct admin password can write
- **database functions or server functions** for validated write operations

Why this backend stack:

- It removes the need to manage your own servers.
- It is well suited for low-traffic personal apps.
- It supports authentication and relational data well.
- It is much easier than building a custom backend from scratch.

## Deployment model

- Code repository on GitHub
- Frontend deployed to GitHub Pages
- Backend/database hosted on Supabase
- Custom domain pointed at the frontend

If GitHub Pages becomes awkward later, you can move the frontend to Cloudflare Pages or Vercel without changing the core app design.

## Data model strategy

The database should separate **source-of-truth records** from **derived summaries**.

### Source-of-truth tables

These are the records you never want to "fake" or manually invent later:

- `players`
- `families` or `player_family_links`
- `game_types`
- `games`
- `game_players`
- `rounds`
- `round_entries` for per-player round effects
- `money_settlements`
- `money_transfers`
- `admin_events` or `audit_log`

### Derived tables or views

These can be recalculated from source records:

- `game_point_totals`
- `player_points_leaderboard`
- `family_points_leaderboard`
- `player_money_leaderboard`
- `game_summaries`

In plain language:

- Source-of-truth data is the raw history.
- Derived data is the "current answer" built from that history.

This split is important because it makes delete, undo, recalculation, and bug-fixing much safer.

## Recommended write flow

For every admin action, use the same basic pattern.

Example: "Add round"

1. User fills in the round form.
2. Frontend sends the request to the server.
3. Server validates the payload.
4. Server writes the round and player point changes to the database.
5. Server recalculates or queues recalculation of totals and leaderboards.
6. Frontend reloads the latest game data.
7. If any step fails, show a clear message such as "Sync failed. Refreshing latest data."

This pattern should be used for:

- create game
- update game settings
- add players to game
- create player
- add round
- delete round
- calculate money / end game
- undo money settlement
- delete game
- rename player
- edit family membership

## How to model game types

Game types should be code modules, not hardcoded page-specific logic.

Each game type should define:

- `id`
- `name`
- `icon`
- round form fields
- validation rules
- point calculation function
- text summary generator for history display

### Why this matters

If you hardcode each game type directly into the UI, the app will get messy quickly.

If you instead create a game type interface, then:

- Texas Hold'em becomes one implementation
- Fight the Landlord becomes another implementation
- future game types become much easier to add

### Recommended order

1. Build the generic game type interface.
2. Implement Texas Hold'em.
3. Implement Fight the Landlord.
4. Refactor only after both work in the real UI.

That order keeps abstraction useful rather than premature.

## How to handle money settlement

This feature deserves its own design because it affects both game history and global leaderboards.

### Recommended approach

When the user presses `calculate $`:

1. Confirm the game should end.
2. Lock the game against new rounds.
3. Read final point totals for that game.
4. Convert points to money using that game's current money settings.
5. Merge family members into a single settlement unit for transfer calculation only.
6. Compute the minimum set of transfers between losers and winners.
7. Save:
   - one settlement event
   - the transfer list
   - the per-player money impact for leaderboards
8. Show the transfer popup to the user.

### Why calculate transfers locally and store the result

Your plan says the transfer script should calculate locally. That is reasonable for the popup and user experience.

But the final accepted result should still be stored in the database.

Why:

- The popup is not the permanent record.
- The database needs the accepted settlement to support history and leaderboards.
- If the user opens the game later, the app should show the same final transfer result.

## Authentication and permissions

Your requirement is:

- public read access
- admin-only edits

That should be implemented as:

- anyone can load public views
- only callers that present the correct shared admin password (compared to a stored hash in the DB) can perform write operations
- buttons for editing can be hidden or disabled unless admin is logged in

### Beginner-friendly explanation

Think of it like a museum:

- the public can walk through and look
- only staff can move or relabel the exhibits

This is simpler and safer than trying to hide the whole app behind a login.

## Mobile-first UI strategy

Your plan is very clearly mobile-oriented, so the app should be designed for narrow screens first.

### Core UI rules

- use large tap targets
- use bottom sheets or compact modals instead of huge desktop-style forms
- keep tables horizontally compressed
- use short labels in leaderboard tables
- prefer sliders, steppers, toggles, and select lists over freeform numeric input where possible
- keep all important actions reachable with one thumb on a phone

### Recommended page strategy

#### 1. Games page

Build this first because it is the entry point and the heart of the app.

Features:

- admin login area
- new game button
- paginated recent game list
- delete game confirmation

#### 2. Game view

This is the most important page in the product.

Features:

- display name
- exit button
- new round
- add players
- game settings
- player list
- lock/unlock player
- remove player from game
- running point total
- calculate money
- paginated history
- delete round / undo settlement

#### 3. Leaderboards

Build after game history works correctly.

Why later:

- Leaderboards depend on almost every other part of the system.
- If you build them too early, you will keep rewriting them.

#### 4. Admin console

Build after the core player/game flow is stable.

Why later:

- It is important, but it is not the highest-risk part.
- It mostly depends on data structures already being correct.

## Recommended delivery roadmap

This is the order I would actually build the product.

## Phase 0: Clarify rules before coding

Goal: remove ambiguity before implementation starts.

Tasks:

- decide exact family model:
  - is "family" a named group, or just linked players?
- define how game wins/losses are counted:
  - by final total?
  - by positive/negative points only?
  - what if tied?
- define how locked players affect zero-sum calculations
- define whether deleting a player from a game is allowed after they already appear in rounds
- define whether player renaming changes historical display text or only future views
- define rounding rules for money to the cent
- define how Fight the Landlord handles uneven loss distribution

Why this phase matters:

Many project delays come from hidden rule questions, not from coding difficulty.

## Phase 1: Foundation and infrastructure

Goal: create the technical skeleton.

Tasks:

- set up frontend app
- set up Supabase project
- create database schema
- add authentication
- add role/permission rules
- add shared validation models
- add deployment pipeline

Deliverable:

- the app loads
- public read access works
- admin login works
- database connection works

## Phase 2: Core data and write pipeline

Goal: make the app reliable before it becomes feature-rich.

Tasks:

- implement source-of-truth tables
- implement derived views/tables
- create write functions for:
  - create player
  - create game
  - add player to game
  - update game settings
  - delete game
- create error handling and refresh flow
- create audit logging

Deliverable:

- admin actions can safely write data
- failed writes recover gracefully

## Phase 3: Texas Hold'em MVP

Goal: finish the first end-to-end playable loop.

Tasks:

- build Games page
- build Game view
- build Add Player flow
- build Texas Hold'em round form
- validate zero-sum totals
- save round history
- show running point totals
- allow round deletion

Deliverable:

- you can create a game, add players, enter rounds, and see the game update correctly

Why this comes first:

If this phase works, the app already proves its basic value.

## Phase 4: Leaderboards from real data

Goal: prove that saved history can produce accurate long-term summaries.

Tasks:

- build points leaderboard
- add filtering by game type
- add sortable columns
- add family leaderboard
- define and show win/loss statistics
- add pagination

Deliverable:

- leaderboards update from actual saved rounds, not fake demo data

Why now:

Once one game type is working, leaderboards become meaningful and testable.

## Phase 5: End-game money settlement

Goal: support the full life cycle of a money-based game.

Tasks:

- build `calculate $` flow
- add end-game confirmation
- lock game when settlement is confirmed
- compute minimal transfer set
- store settlement history
- update money leaderboard
- support settlement deletion / undo

Deliverable:

- games can end cleanly and money totals persist correctly

## Phase 6: Fight the Landlord implementation

Goal: prove the modular game type architecture.

Tasks:

- build Fight the Landlord round form
- implement bomb multiplier logic
- implement landlord multiplier logic
- implement landlord friend logic
- implement zero-sum distribution rules
- generate round summary text
- verify against hand-worked examples

Deliverable:

- second game type works without rewriting the app structure

Why after Texas Hold'em:

This reduces risk. You first prove the platform, then prove the flexible rules engine.

## Phase 7: Admin Console

Goal: make long-term maintenance pleasant.

Tasks:

- rename players
- edit players
- manage family links
- handle safe restrictions around historical records
- improve admin-only controls

Deliverable:

- administrative cleanup can happen without direct database edits

## Phase 8: Polish, testing, and release hardening

Goal: make the app dependable in everyday use.

Tasks:

- mobile usability pass
- Unicode input testing
- confirm dialog consistency
- empty-state handling
- loading and error states
- pagination checks
- delete/undo regression tests
- backup/export strategy

Deliverable:

- app is usable on a real phone and safe to keep using over time

## Testing strategy

Because this app is mostly about correctness, testing should focus on logic and data integrity more than flashy UI.

### Highest-priority tests

- round calculations for each game type
- zero-sum validation
- locked-player behavior
- settings change affects future rounds only
- delete round recalculates totals correctly
- delete game removes leaderboard impact correctly
- settlement calculation minimizes transactions
- family grouping changes transfers correctly
- settlement undo restores previous state

### UI tests worth having

- admin login enables editing
- public mode stays read-only
- pagination works
- mobile dialogs open and close correctly
- numeric controls behave correctly on small screens

## Risks and how this roadmap reduces them

### Risk 1: The app becomes hard to change once multiple game types exist

Reduction:

- define the game type interface early
- fully implement one simpler game type first

### Risk 2: Leaderboards become wrong after deletes or setting changes

Reduction:

- store history as source-of-truth
- derive totals from history

### Risk 3: Authentication becomes fragile or annoying

Reduction:

- use managed authentication
- keep reads public and writes admin-only

### Risk 4: The app feels crowded on a phone

Reduction:

- design mobile-first from the beginning
- delay big dense tables until real data exists

### Risk 5: The "async worker" idea adds too much complexity too early

Reduction:

- start with validated server writes and reliable refresh
- add queued recalculation only where it truly helps

## What I would not do in version 1

To keep the project realistic, I would avoid these at the beginning:

- offline editing
- multi-admin collaboration with conflict resolution
- real-time syncing between multiple devices
- custom self-hosted authentication
- many game types before the first two are solid
- overly complex worker infrastructure

These can be added later if the app proves useful in real use.

## Practical build sequence summary

If I had to reduce the whole strategy to one sentence:

**Build the smallest reliable version of the history system first, prove it with Texas Hold'em, then add leaderboards, money settlement, and finally the more specialized game logic.**

That sequence is the best balance of:

- speed
- simplicity
- correctness
- future flexibility

## Final recommendation

The strongest implementation strategy for `mulberry` is:

- use a simple mobile-first React frontend
- keep the website publicly viewable
- restrict all edits to admin-authenticated actions
- store history events as the permanent truth
- compute leaderboards from that truth
- ship in phases, starting with one simpler game type

This approach is not the fanciest one, but it is the one most likely to produce a working, maintainable app without unnecessary complexity.
