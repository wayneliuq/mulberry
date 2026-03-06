import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { AdminSessionProvider } from "./features/admin/AdminSessionContext";
import { appRoutes } from "./router";

function renderApp(initialEntries = ["/"]) {
  const router = createMemoryRouter(appRoutes, { initialEntries });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <RouterProvider router={router} />
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}

describe("app shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the primary navigation", () => {
    renderApp();

    expect(screen.getByRole("link", { name: "Games" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Leaderboards" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("keeps new game disabled in public mode", () => {
    renderApp();

    expect(
      screen.getByRole("button", { name: "Create new game" }),
    ).toBeDisabled();
  });

  it("enables admin controls after local login", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(
      screen.getByLabelText("Shared admin password"),
      "super-secret",
    );
    await user.click(
      screen.getByRole("button", { name: "Unlock admin actions" }),
    );

    expect(
      screen.getByRole("button", { name: "Create new game" }),
    ).toBeEnabled();
    expect(screen.getByText("Editing enabled")).toBeInTheDocument();
  });
});
