import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchBasketballSeasons } from "../../lib/api/read";
import type { BasketballSeasonSummary } from "../../lib/api/types";
import {
  formatNextSeasonNotice,
  isInstantInSeason,
} from "./seasons";

export function useBasketballSeasons(enabled = true) {
  const seasonsQuery = useQuery({
    queryKey: ["basketball-seasons"],
    queryFn: fetchBasketballSeasons,
    staleTime: 60_000,
    enabled,
  });

  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  useEffect(() => {
    if (seasonsQuery.data && selectedSeasonId === null) {
      setSelectedSeasonId(seasonsQuery.data.activeSeasonId);
    }
  }, [seasonsQuery.data, selectedSeasonId]);

  const resolvedSeasonId =
    selectedSeasonId ?? seasonsQuery.data?.activeSeasonId ?? null;

  const selectedSeason = useMemo((): BasketballSeasonSummary | null => {
    if (!seasonsQuery.data || resolvedSeasonId === null) {
      return null;
    }
    return (
      seasonsQuery.data.seasons.find((season) => season.id === resolvedSeasonId) ??
      null
    );
  }, [resolvedSeasonId, seasonsQuery.data]);

  const activeSeason = useMemo((): BasketballSeasonSummary | null => {
    if (!seasonsQuery.data) return null;
    return (
      seasonsQuery.data.seasons.find(
        (season) => season.id === seasonsQuery.data.activeSeasonId,
      ) ?? null
    );
  }, [seasonsQuery.data]);

  const isViewingActiveSeason =
    selectedSeason !== null &&
    activeSeason !== null &&
    selectedSeason.id === activeSeason.id;

  const noticeText = useMemo(() => {
    if (!selectedSeason) return null;
    if (!isViewingActiveSeason) {
      return `Viewing ${selectedSeason.displayName}`;
    }
    const nextStart = new Date(selectedSeason.endsAt);
    return formatNextSeasonNotice(nextStart);
  }, [isViewingActiveSeason, selectedSeason]);

  const viewingHistoricalSeason =
    selectedSeason !== null &&
    activeSeason !== null &&
    !isInstantInSeason(new Date(), selectedSeason) &&
    selectedSeason.id !== activeSeason.id;

  return {
    seasonsQuery,
    seasons: seasonsQuery.data?.seasons ?? [],
    activeSeasonId: seasonsQuery.data?.activeSeasonId ?? null,
    selectedSeasonId: resolvedSeasonId,
    setSelectedSeasonId,
    selectedSeason,
    activeSeason,
    isViewingActiveSeason,
    viewingHistoricalSeason,
    noticeText,
  };
}
