import {
  createBrowserRouter,
  type RouteObject,
} from "react-router-dom";
import { AppLayout } from "./features/layout/AppLayout";
import { AdminConsolePage } from "./routes/AdminConsolePage";
import { GameViewPage } from "./routes/GameViewPage";
import { GamesPage } from "./routes/GamesPage";
import { LeaderboardsPage } from "./routes/LeaderboardsPage";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <GamesPage />,
      },
      {
        path: "leaderboards",
        element: <LeaderboardsPage />,
      },
      {
        path: "admin",
        element: <AdminConsolePage />,
      },
      {
        path: "games/:gameId",
        element: <GameViewPage />,
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
