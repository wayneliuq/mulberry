import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminSession } from "../admin/AdminSessionContext";
import { adminWrite } from "../../lib/api/admin";
import type { BasketballSeasonSummary } from "../../lib/api/types";

type BasketballSeasonToolbarProps = {
  seasons: BasketballSeasonSummary[];
  selectedSeasonId: number | null;
  onSeasonChange: (seasonId: number) => void;
  noticeText: string | null;
  isLoading?: boolean;
};

export function BasketballSeasonToolbar({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  noticeText,
  isLoading = false,
}: BasketballSeasonToolbarProps) {
  const { isAdmin, password } = useAdminSession();
  const queryClient = useQueryClient();

  const rolloverMutation = useMutation({
    mutationFn: async () => {
      if (!password) {
        throw new Error("Admin password required.");
      }
      return adminWrite({
        action: "rollover_basketball_season",
        password,
        force: true,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["basketball-seasons"] }),
        queryClient.invalidateQueries({ queryKey: ["basketball-round-history"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  return (
    <div className="basketball-season-toolbar stack-sm">
      {noticeText ? (
        <p className="basketball-season-notice" aria-live="polite">
          {noticeText}
        </p>
      ) : null}
      <div className="inline-actions wrap">
        <label className="basketball-season-select-label">
          <span className="muted">Season</span>
          <select
            className="basketball-season-select"
            value={selectedSeasonId ?? ""}
            disabled={isLoading || seasons.length === 0}
            onChange={(event) => {
              const nextId = Number(event.target.value);
              if (Number.isFinite(nextId)) {
                onSeasonChange(nextId);
              }
            }}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.displayName}
                {season.isActive ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        {isAdmin ? (
          <button
            type="button"
            className="secondary-button"
            disabled={rolloverMutation.isPending}
            onClick={() => rolloverMutation.mutate()}
          >
            {rolloverMutation.isPending ? "Starting season…" : "Start next season"}
          </button>
        ) : null}
      </div>
      {rolloverMutation.isError ? (
        <p className="error-text">
          {rolloverMutation.error instanceof Error
            ? rolloverMutation.error.message
            : "Could not start next season."}
        </p>
      ) : null}
    </div>
  );
}
