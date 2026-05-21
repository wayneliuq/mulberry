import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { fetchBasketballSeasons } from "../../lib/api/read";
import { useBasketballSeasons } from "./useBasketballSeasons";

vi.mock("../../lib/api/read", () => ({
  fetchBasketballSeasons: vi.fn(),
}));

const fetchBasketballSeasonsMock = vi.mocked(fetchBasketballSeasons);

const payload = {
  seasons: [
    {
      id: 1,
      seasonNumber: 1,
      displayName: "Season 1",
      startsAt: "1970-01-01T00:00:00.000Z",
      endsAt: "2026-06-21T07:00:00.000Z",
      isActive: false,
      schemaVersion: 1,
    },
    {
      id: 2,
      seasonNumber: 2,
      displayName: "Season 2",
      startsAt: "2026-06-21T07:00:00.000Z",
      endsAt: "2026-12-21T08:00:00.000Z",
      isActive: true,
      schemaVersion: 1,
    },
  ],
  activeSeasonId: 2,
};

function wrapper(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/a" element={children} />
          <Route path="/b" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("useBasketballSeasons", () => {
  it("defaults to active season on load", async () => {
    fetchBasketballSeasonsMock.mockResolvedValue(payload);
    const { result } = renderHook(() => useBasketballSeasons(true), {
      wrapper: wrapper("/a"),
    });

    await waitFor(() => {
      expect(result.current.selectedSeasonId).toBe(2);
    });
  });

  it("snaps back to active season when route changes", async () => {
    fetchBasketballSeasonsMock.mockResolvedValue(payload);

    const { result } = renderHook(
      () => ({
        seasons: useBasketballSeasons(true),
        navigate: useNavigate(),
      }),
      { wrapper: wrapper("/a") },
    );

    await waitFor(() => {
      expect(result.current.seasons.selectedSeasonId).toBe(2);
    });

    act(() => {
      result.current.seasons.setSelectedSeasonId(1);
    });
    await waitFor(() => {
      expect(result.current.seasons.selectedSeasonId).toBe(1);
    });

    act(() => {
      result.current.navigate("/b");
    });

    await waitFor(() => {
      expect(result.current.seasons.selectedSeasonId).toBe(2);
    });
  });
});
