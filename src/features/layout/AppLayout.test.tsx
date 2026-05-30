import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminSessionProvider } from "../admin/AdminSessionContext";
import { AppLayout } from "./AppLayout";

function renderLayout(initialPath = "/") {
  return render(
    <AdminSessionProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Games content</div>} />
            <Route path="/leaderboards" element={<div>Leaderboards content</div>} />
            <Route path="/games/:gameId" element={<div>Game detail</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AdminSessionProvider>,
  );
}

describe("AppLayout", () => {
  it("shows app bar title and bottom navigation on top-level routes", () => {
    renderLayout("/");

    expect(screen.getByRole("heading", { name: "Games" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Games" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaderboards" })).toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
  });

  it("shows bottom navigation on game detail routes", () => {
    renderLayout("/games/abc");

    expect(screen.getByRole("heading", { name: "Game" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Games" })).toHaveClass("bottom-nav-item-active");
  });
});
