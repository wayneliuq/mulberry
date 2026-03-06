# Project Plans

## Core Principals

- simple, robust, open-source, no private information, minimal security concerns
- hosted for free on github, minimal traffic, private use only
- publicly accessible domain, with a simple admin login to prevent accidental edits
- UI optimized for mobile browser display and usage (compact, vertical, where reasonable, use up/down or sliders instead of number input)
- Support all unicode characters in text input and display (emojis, asian characters, etc)
- All information in the app should be stored in db (player list, points, game/round history), via asynchronous workers, and validated (if asynchronous worker could not successfully update db to reflect local changes, graceful error and refresh, showing something like "connection error?")
  - Some information can be calculated in-memory, such as points distributions.
  - Leaderboards - calculated in memory or in server? TBD

## Simple overview

- name: mulberry
- description: this app helps permanently track points in game, rounds, and in history for leaderboards
- helps permanently track points which persists in db, and if a game involves money, the $ involved for leaderboard, also persists in db
- Definitions:
  - Game: a game session, consists of numerous rounds.
  - Round: A single round where points are calculated. for instance, a round in texas hold'em is when everyone folds except one player.
  - Game and round history persists in db
  - Game type: a modular component that separates game types mostly based on how points are calculated (i.e. texas hold'em vs fight the landlord).
  - Leaderboard: shows the cumulative sum of the points and $ gain/loss for all players
    - Points leaderboard: by game, and total for all games, also counts rounds lost/won, games lost/won
    - $ leaderboard: total



## UI + logic

### Pages: 

1. Games
2. Leaderboards
3. Admin Console

### Page 1: "Games"

$ - means the money emoji/icon

Top: admin password login (enables all editing functions, such as create players, create games, etc., without password, view only. can view all games and game history and leader boards)

Button: New Game, leads to pop-up to select the game type via dropdown, points basis per round (default 1, slider or scroll to 100, must be at least 1), and $ per point (default $0.20, scroll in 5 cent increments. Can be set to $0). Then confirm via "Create Game" or exit via "Cancel". After clicking create game, goes into the game view. When creating a new game, the game creation date is tracked in the db, as well as a "game name" that is just a display name. The default display name is the date + game type (i.e. Texas Hold'em on May 21, 2026)

Under the button: Sees history of games with most recent at top, date of when the game was created and last updated, paged view with 5 games per page for all games in history. Click into each game to go into the game view. Admin can delete games (purged from db and leaderboard calculations). A pop-up confirmation is needed to confirm deletion (or cancel). 

#### "Game View"

Game view shows the game display name, then buttons at the top, "new round", "add players", and "game settings"

"new round" enters a pop-up which allows points to be inputted and calculated (depending on game type. for instance, zero-sum games would be adding points to certain players, and the the game type settings automatically deduct points from other points). 

"add players" enables a pop-up for adding players to the game, as a compact list that can be selected via checkbox. The "add players" pop-up also has a button at the bottom for "create player", which enables a conditional input box for inputting the name of a new player that does not exist in the database. Each player should be assigned a uniqueID (sequential, incrementing). Each player also has an optional "family" field where other existing players can be added. (this family setting is useful for leaderboards/calculating $). Once players are added, these players' checkboxes are greyed out. Other players can still be added (join the game per game type settings).

"game settings" allows changing the same settings from "create game" for this game, namely point basis per round, $ per point. When changing, these settings only apply going forward and does not retroactively apply to rounds that had happened already. In game settings, an additional option allows changing the game display name via text input (not shown in create game).

Under the buttons, shows the list of all players and their current points (green for positive, red for negative, black for 0). a small trash bin icon at the right of each player can enable deleting that player from the game. a small lock icon on the left of each player can "lock" that player - excluded from all points calculations until unlocked (i.e. player has temporarily walked away from the game and will come back layer). At the bottom of the player list, show the current point total for this game.

Under player list, show a button for "calculate $". This button is greyed out if $ is set to $0.00 in game settings. When clicking this button, show an additional confirmation pop-up: "end game?" with "yes" and "no". "No" returns to the game view unchanged. if user confirms "yes", the game is locked (no new rounds can be created), and the $ calculations begin - the $ is now added to the leaderboards for each player, Using $ per point, calculate how much money players who lost money should transfer to the players who won money based on current point totals. If two players in the game belong to the same "family", then they are treated as a single unit for money transfer only. Use a script to generate a pop-up that shows who should transfer what sum of money to who, in the fewest number of total transactions, and this should be calculated locally:  
i.e. player A: +14, Player B: +7, Player C: -10, Player D: -1, Player E: -10. Player D transfer 1 unit of money to Player A. Player C Transfer 10 units of money to Player A. Player E transfers 3 unit of money to Player A, and 7 units of money to player B. The $ transfer is registered as a history event (along with individual rounds of the game). A pop-up confirmation is needed to delete the history event.

under the "calculate $" button shows history, the a list of all rounds in the game, from most recent at the top, shows 10 at a time, paged. Each history item shows which players have lost or gained points (and date/time stamped). Admin can delete invidiaul rounds, purging it from calculations and leaderboards (can be done even if game is locked). Admin can also delete the calculate $ history here, undoing the game lock and purging the $ from the leaderboards. A pop-up confirmation is needed to delete the history event.

in game view, there should be a "x" exit button in the top left corner to return to the games page.

### Page 2: Leaderboards

Leaderboards has several tabs that displays different views

#### Points View

At the top, displays a buttons for "all" (selected by default) and then individual buttons for each game type that exists in the game. clicking on a button filters the leaderboards to only show the cumulative totals for that game type (or return to view cumulative for all game types).

Displays all individual players and their point total, cumulative from all rounds/games. Updated each time a new round is created. Also include stats for # of rounds won, # of rounds lost, # of games won, and # games lost (shorten names for the table so it is viewable in vertical display on a phone), and the round Win/Loss Ratio and the Game Win/Loss Ratio. Paged table if more than 20 players. Sortable table for each numeric column.

Under this table, there is a "family" leaderboard. This only shows players with a "family", the family column lists the players in that family, and the same tally except for the players in that family added together for same stats as the individual player points table above.

#### $ View

Displays all individual players and their $ total lost or won, cumulative from all games, updated each time the "calculate $" button is pressed and user confirmed to end game. Also show games won, games lost, games won/lost ratio, and average $ (gain/loss) per game.

### Page 3: Admin Console

This page has several sections to manage games:

- edit, add, or rename players
- edit, add, or remove players from families

### Game Types

Game types must be coded. To start, let's have two game types, and then uss these as a framwork so we can add new game types more easily. Each game type should be "icon" "name"

#### Game Type 1: [poker icon] "Fight the Landlord (SE)"

Add round pop-up UI:

Select: Won, Lost

bomb multipler (1-10 scroll)

Landlord: player select, landlord multiplier (1 to 6 scroll)

Landlord Friends: player multi-select

Points calculation: zero-sum - if players gain points, all other players lose the same sum of points evenly distributed. and vice versa. If won, landlord and landlord friends gain points, and other players lose points distributed evenly. If lost, landlord and landlord friends lose points distributed evenly. Amount of points for landlord = point basis x bomb multipler x landlord multipler, landlord friend points each is point basis x bomb multipler

#### Game Type 2: [poker icon] Texas Hold'em

Add round pop-up UI:

A list of all players, and number input for points won or lost. If sum of input is not 0, provide graceful warning "total sum is 7" with "confirm" or "cancel" , cancel means players can edit the input.

All views/pop-ups should have a "x" button to exit to the previous page.

