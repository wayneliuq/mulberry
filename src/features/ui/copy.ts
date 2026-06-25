/** Centralized user-facing copy (Material sentence case, verb-first actions). */
export const copy = {
  app: {
    name: "Mulberry",
  },
  nav: {
    games: "Games",
    leaderboards: "Leaderboards",
    dashboards: "Dashboards",
    admin: "Admin",
  },
  editMode: {
    viewOnly: "View only",
    editing: "Editing",
    unlock: "Unlock editing",
    signOut: "Sign out",
    passwordLabel: "Admin password",
    passwordPlaceholder: "Enter password",
    checkingSession: "Checking saved session…",
    signedIn: "You can edit scores and settings",
    adminLocked: "Sign in on Games to unlock admin tools",
  },
  games: {
    eyebrow: "Games",
    title: "Games",
    previousPage: "Previous",
    nextPage: "Next",
    pageStatus: (page: number, total: number) => `Page ${page} of ${total}`,
    newGame: "New game",
    createGame: "Create game",
    cancel: "Cancel",
    emptyAll: "No games yet. Create the first one while editing.",
    emptyFilter: "No games for this type.",
    loading: "Loading games…",
    deleteConfirm:
      "Delete this game? Leaderboard stats from its rounds will be removed.",
  },
  gameView: {
    back: "Back to games",
    settled: "Settled",
    readOnly: "View only",
    editing: "Editing",
    newRound: "New round",
    addPlayers: "Add players",
    settings: "Settings",
    saveSettings: "Save",
    roster: "Roster",
    history: "Round history",
    historyOrder: "Newest first",
    noRounds: "No rounds yet.",
    settle: "Settle game",
    undoSettlement: "Undo settlement",
    settlementEyebrow: "Settlement",
    settlementUndoConfirm: "Undo this settlement and reopen the game?",
    settleConfirmNoMoney: "End this game and mark as settled? (No money to exchange.)",
    settleConfirm: "End this game and calculate settlement?",
  },
  leaderboards: {
    eyebrow: "Leaderboards",
    title: "Standings",
    showMoney: "Show money",
    winRate: "Win rate",
    loading: "Loading standings…",
    familiesEyebrow: "Families",
    familiesEmpty:
      "Families appear when at least two players share a family name.",
    emptyPlayers: "No standings for this filter yet.",
  },
  dashboards: {
    eyebrow: "Dashboards",
    title: "Basketball analytics",
    subtitle: "Season stats from recorded rounds",
    back: "Back to leaderboards",
    jump: "Jump to section",
    loading: "Loading dashboard…",
    roundsAnalyzed: (n: number) => `${n} rounds analyzed`,
  },
  admin: {
    eyebrow: "Admin",
    title: "Player maintenance",
    subtitle: "Rename players, link families, and manage ghost status",
    createPlayer: "Create player",
    saveName: "Save name",
    saveFamily: "Save family",
    ready: "Ready",
    locked: "Locked",
  },
  common: {
    done: "Done",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    loading: "Loading…",
  },
  addPlayers: {
    title: "Add players",
    searchPlaceholder: "Search players",
    allInGame: "All players are already in this game.",
    noSearchMatch: "No players match your search.",
    addSelected: "Add",
  },
} as const;

export type PageTitleKey =
  | "games"
  | "leaderboards"
  | "dashboards"
  | "admin"
  | "game";

export function pageTitleForPath(pathname: string): PageTitleKey {
  if (pathname.startsWith("/games/")) return "game";
  if (pathname.startsWith("/leaderboards")) return "leaderboards";
  if (pathname.startsWith("/dashboards")) return "dashboards";
  if (pathname.startsWith("/admin")) return "admin";
  return "games";
}

export function pageTitleLabel(key: PageTitleKey): string {
  switch (key) {
    case "games":
      return copy.nav.games;
    case "leaderboards":
      return copy.nav.leaderboards;
    case "dashboards":
      return copy.nav.dashboards;
    case "admin":
      return copy.nav.admin;
    case "game":
      return "Game";
  }
}
