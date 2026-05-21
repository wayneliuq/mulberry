import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminSessionProvider } from "../admin/AdminSessionContext";
import { BasketballSeasonToolbar } from "./BasketballSeasonToolbar";

function renderToolbar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <MemoryRouter>
          <BasketballSeasonToolbar
            seasons={[
              {
                id: 1,
                seasonNumber: 1,
                displayName: "Season 1",
                startsAt: "1970-01-01T00:00:00.000Z",
                endsAt: "2026-06-21T07:00:00.000Z",
                isActive: true,
                schemaVersion: 1,
              },
            ]}
            selectedSeasonId={1}
            onSeasonChange={() => undefined}
            noticeText="New season starts on June 21, 2026 - 32 days away"
          />
        </MemoryRouter>
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}

describe("BasketballSeasonToolbar", () => {
  it("renders next-season notice and season selector", () => {
    renderToolbar();
    expect(
      screen.getByText("New season starts on June 21, 2026 - 32 days away"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
