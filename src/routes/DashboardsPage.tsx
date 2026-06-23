import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BasketballSeasonToolbar } from "../features/basketball/BasketballSeasonToolbar";
import { useBasketballSeasons } from "../features/basketball/useBasketballSeasons";
import { nbaCompStorageKeyForSeason } from "../features/basketball/seasons";
import { buildBasketballDashboardMetricsFromData } from "../features/dashboards/basketball/compute";
import {
  METRIC_META,
  NBA_COMPARISON_SECTION_TITLE,
} from "../features/dashboards/basketball/constants";
import type {
  DashboardMetricSection,
  DashboardMetricSplitSection,
} from "../features/dashboards/basketball/types";
import { createLocalStorageNbaCompAdapter } from "../features/dashboards/basketball/nbaComparisons";
import { buildFtlDashboardMetrics } from "../features/dashboards/ftl/compute";
import type {
  FtlDashboardSection,
  FtlDashboardSplitSection,
} from "../features/dashboards/ftl/types";
import { MetricCard } from "../features/dashboards/components/MetricCard";
import { NbaComparisonTable } from "../features/dashboards/components/NbaComparisonTable";
import { RankedTable } from "../features/dashboards/components/RankedTable";
import { SectionHeader } from "../features/ui/SectionHeader";
import { copy } from "../features/ui/copy";
import { fetchBasketballDashboardData, fetchFtlDashboardData } from "../lib/api/read";

type DashboardGameType = "basketball" | "fight-the-landlord";

const DASHBOARD_GAME_OPTIONS: Array<{
  id: DashboardGameType;
  name: string;
  icon: string;
}> = [
  { id: "basketball", name: "Basketball", icon: "basketball" },
  { id: "fight-the-landlord", name: "Fight the Landlord", icon: "cards" },
];

function findSplitSection(
  sections: DashboardMetricSplitSection[],
  id: string,
): DashboardMetricSplitSection | undefined {
  return sections.find((section) => section.id === id);
}

function findSection(
  sections: DashboardMetricSection[],
  id: string,
): DashboardMetricSection | undefined {
  return sections.find((section) => section.id === id);
}

function FtlDashboardView() {
  const ftlQuery = useQuery({
    queryKey: ["dashboards", "ftl"],
    queryFn: fetchFtlDashboardData,
  });

  const ftlMetrics = useMemo(() => {
    if (!ftlQuery.data) return null;
    return buildFtlDashboardMetrics(ftlQuery.data);
  }, [ftlQuery.data]);

  const ftlSectionOrder = useMemo(
    () => [
      "landlordWinRate",
      "landlordFrequency",
      "allianceWinRate",
      "biggestPots",
      "winStreaks",
    ],
    [],
  );

  const ftlSectionsById = useMemo(
    () => new Map(ftlMetrics?.sections.map((s) => [s.id, s]) ?? []),
    [ftlMetrics],
  );
  const ftlSplitSectionsById = useMemo(
    () => new Map(ftlMetrics?.splitSections.map((s) => [s.id, s]) ?? []),
    [ftlMetrics],
  );

  if (ftlQuery.isLoading) {
    return (
      <article className="card stack-sm">
        <SectionHeader
          eyebrow={copy.dashboards.eyebrow}
          title="Fight the Landlord Stats"
        />
        <p className="muted">Loading…</p>
      </article>
    );
  }

  if (ftlQuery.isError || !ftlMetrics) {
    return (
      <article className="card stack-sm">
        <SectionHeader
          eyebrow={copy.dashboards.eyebrow}
          title="Fight the Landlord Stats"
        />
        <p className="form-error">
          {ftlQuery.error instanceof Error
            ? ftlQuery.error.message
            : "Unable to load dashboard data."}
        </p>
      </article>
    );
  }

  return (
    <>
      <div className="inline-actions space-between">
        <span className="pill">
          {ftlMetrics.diagnostics.totalRounds} rounds · {ftlMetrics.diagnostics.eligiblePlayers} players
        </span>
      </div>

      <article className="card stack-sm">
        <SectionHeader
          eyebrow={copy.dashboards.eyebrow}
          title="Fight the Landlord Stats"
          subtitle="Statistics from structured rounds with landlord side data"
        />
      </article>

      <article className="card stack-sm">
        <SectionHeader eyebrow={copy.dashboards.jump} title="Sections" />
        <div className="inline-actions">
          {ftlSectionOrder.map((id) => {
            const label =
              ftlSplitSectionsById.get(id)?.title ??
              ftlSectionsById.get(id)?.title ??
              id;
            return (
              <a key={id} className="filter-chip" href={`#dashboard-${id}`}>
                {label}
              </a>
            );
          })}
        </div>
      </article>

      {ftlSectionOrder.map((id) => {
        const splitSection = ftlSplitSectionsById.get(id);
        if (splitSection) {
          return (
            <MetricCard key={id} id={`dashboard-${id}`} title={splitSection.title}>
              <p className="muted">{splitSection.explanation}</p>
              <details className="dashboard-details" open>
                <summary>{splitSection.positiveTitle}</summary>
                <RankedTable rows={splitSection.positiveRows} valueHeader={id === "allianceWinRate" ? "Lift" : "Win %"} />
              </details>
              {splitSection.negativeRows.length > 0 ? (
                <details className="dashboard-details" open>
                  <summary>{splitSection.negativeTitle}</summary>
                  <RankedTable rows={splitSection.negativeRows} valueHeader={id === "allianceWinRate" ? "Lift" : "Win %"} />
                </details>
              ) : null}
            </MetricCard>
          );
        }

        const section = ftlSectionsById.get(id);
        if (!section) return null;

        // Overall win rate chip for landlord win rate section
        const overallChip =
          id === "landlordWinRate" ? (
            <div className="dashboard-highlight-item" style={{ marginBottom: "1rem" }}>
              <p className="dashboard-highlight-label">Overall Landlord Win Rate</p>
              <p className="dashboard-highlight-value">{ftlMetrics!.overallWinRate.rate}%</p>
              <p className="dashboard-highlight-detail">
                {ftlMetrics!.overallWinRate.wins}W / {ftlMetrics!.overallWinRate.losses}L in {ftlMetrics!.overallWinRate.total} rounds
              </p>
            </div>
          ) : null;

        // Wider value column for biggest pots
        const valueHeader = id === "biggestPots" ? "Points" : undefined;
        const valueMinWidth = id === "biggestPots" ? "5rem" : undefined;

        return (
          <MetricCard key={id} id={`dashboard-${id}`} title={section.title}>
            {overallChip}
            <p className="muted">{section.explanation}</p>
            <details className="dashboard-details" open>
              <summary>Ranked results</summary>
              <RankedTable rows={section.rows} valueHeader={valueHeader} valueMinWidth={valueMinWidth} />
            </details>
          </MetricCard>
        );
      })}
    </>
  );
}

function BasketballDashboardView() {
  const {
    seasons,
    selectedSeasonId,
    setSelectedSeasonId,
    noticeText,
    seasonsQuery,
  } = useBasketballSeasons();

  const dashboardQuery = useQuery({
    queryKey: ["dashboards", "basketball", selectedSeasonId],
    queryFn: () => fetchBasketballDashboardData(selectedSeasonId!),
    enabled: selectedSeasonId !== null,
  });

  const metrics = useMemo(() => {
    if (!dashboardQuery.data || selectedSeasonId === null) return null;
    return buildBasketballDashboardMetricsFromData(dashboardQuery.data, {
      nbaCompStorage: createLocalStorageNbaCompAdapter(
        nbaCompStorageKeyForSeason(selectedSeasonId),
      ),
    });
  }, [dashboardQuery.data, selectedSeasonId]);

  const sectionOrder = useMemo(
    () => [
      "nbaComp",
      "combos",
      "clutch",
      "rivalry",
      "carry",
      "consistency",
      "upset",
      "trios",
      "families",
      "balanced",
    ],
    [],
  );

  const highlightItems = useMemo(() => {
    if (!metrics) return [];
    const combo = findSplitSection(metrics.splitSections, "combos")?.positiveRows[0];
    const clutch = findSplitSection(metrics.splitSections, "clutch")?.positiveRows[0];
    const upset = findSection(metrics.sections, "upset")?.rows[0];
    const balanced = findSection(metrics.sections, "balanced")?.rows[0];
    const nbaFirst = metrics.nbaComparisons[0];
    return [
      nbaFirst
        ? {
            label: "Closest pro match",
            value: `${nbaFirst.playerName} → ${nbaFirst.nbaMatchName}`,
            detail: nbaFirst.fitScore.toFixed(2),
          }
        : null,
      combo ? { label: "Best combo", value: combo.label, detail: combo.valueLabel } : null,
      clutch ? { label: "Clutch leader", value: clutch.label, detail: clutch.valueLabel } : null,
      upset ? { label: "Upset machine", value: upset.label, detail: upset.valueLabel } : null,
      balanced
        ? { label: "Balanced teammate", value: balanced.label, detail: balanced.valueLabel }
        : null,
    ].filter((item): item is { label: string; value: string; detail: string } => item !== null);
  }, [metrics]);

  if (seasonsQuery.isLoading) {
    return (
      <>
        <BasketballSeasonToolbar
          seasons={[]}
          selectedSeasonId={null}
          onSeasonChange={() => {}}
          noticeText={null}
          isLoading
        />
        <p className="muted">Loading basketball seasons…</p>
      </>
    );
  }

  if (seasonsQuery.isError) {
    return (
      <p className="form-error">
        {seasonsQuery.error instanceof Error
          ? seasonsQuery.error.message
          : "Could not load seasons."}
      </p>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <>
        <BasketballSeasonToolbar
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={setSelectedSeasonId}
          noticeText={noticeText}
        />
        <div className="inline-actions space-between">
          <Link to="/leaderboards/basketball" className="secondary-button link-button">
            {copy.dashboards.back}
          </Link>
        </div>
        <article className="card stack-sm">
          <SectionHeader
            eyebrow={copy.dashboards.eyebrow}
            title={copy.dashboards.title}
          />
          <p className="muted">{copy.dashboards.loading}</p>
        </article>
      </>
    );
  }

  if (dashboardQuery.isError || !metrics) {
    return (
      <>
        <BasketballSeasonToolbar
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={setSelectedSeasonId}
          noticeText={noticeText}
        />
        <div className="inline-actions space-between">
          <Link to="/leaderboards/basketball" className="secondary-button link-button">
            {copy.dashboards.back}
          </Link>
        </div>
        <article className="card stack-sm">
          <SectionHeader
            eyebrow={copy.dashboards.eyebrow}
            title={copy.dashboards.title}
          />
          <p className="form-error">
            {dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : "Unable to load dashboard data."}
          </p>
        </article>
      </>
    );
  }

  const splitSectionsById = new Map(
    metrics.splitSections.map((section) => [section.id, section]),
  );
  const sectionsById = new Map(metrics.sections.map((section) => [section.id, section]));

  return (
    <>
      <BasketballSeasonToolbar
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        onSeasonChange={setSelectedSeasonId}
        noticeText={noticeText}
      />

      <div className="inline-actions space-between">
        <Link to="/leaderboards/basketball" className="secondary-button link-button">
          {copy.dashboards.back}
        </Link>
        <span className="pill">
          {copy.dashboards.roundsAnalyzed(metrics.diagnostics.eligibleRounds)}
        </span>
      </div>

      <article className="card stack-sm">
        <SectionHeader
          eyebrow={copy.dashboards.eyebrow}
          title={copy.dashboards.title}
          subtitle={copy.dashboards.subtitle}
        />
        <div className="dashboard-highlights">
          {highlightItems.map((item) => (
            <div key={item.label} className="dashboard-highlight-item">
              <p className="dashboard-highlight-label">{item.label}</p>
              <p className="dashboard-highlight-value">{item.value}</p>
              <p className="dashboard-highlight-detail">{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card stack-sm">
        <SectionHeader eyebrow={copy.dashboards.jump} title="Sections" />
        <div className="inline-actions">
          {sectionOrder.map((id) => {
            const label =
              id === "nbaComp"
                ? "Pro match"
                : splitSectionsById.get(id)?.title ??
                  sectionsById.get(id)?.title ??
                  id;
            return (
              <a key={id} className="filter-chip" href={`#dashboard-${id}`}>
                {label}
              </a>
            );
          })}
        </div>
      </article>

      {sectionOrder.map((id) => {
        if (id === "nbaComp") {
          return (
            <MetricCard key={id} id={`dashboard-${id}`} title={NBA_COMPARISON_SECTION_TITLE}>
              <p className="muted">{METRIC_META.nbaComp.explanation}</p>
              <details className="dashboard-details" open>
                <summary>Matches</summary>
                <NbaComparisonTable rows={metrics.nbaComparisons} />
              </details>
            </MetricCard>
          );
        }

        const splitSection = splitSectionsById.get(id);
        if (splitSection) {
          const valueHeader = splitSection.id === "families" ? "Same-team %" : "Lift";
          return (
            <MetricCard key={id} id={`dashboard-${id}`} title={splitSection.title}>
              <p className="muted">{splitSection.explanation}</p>
              <details className="dashboard-details" open>
                <summary>{splitSection.positiveTitle}</summary>
                <RankedTable rows={splitSection.positiveRows} valueHeader={valueHeader} />
              </details>
              {splitSection.negativeRows.length > 0 ? (
                <details className="dashboard-details" open>
                  <summary>{splitSection.negativeTitle}</summary>
                  <RankedTable rows={splitSection.negativeRows} valueHeader={valueHeader} />
                </details>
              ) : null}
            </MetricCard>
          );
        }

        const section = sectionsById.get(id);
        if (!section) return null;
        return (
          <MetricCard key={id} id={`dashboard-${id}`} title={section.title}>
            <p className="muted">{section.explanation}</p>
            <details className="dashboard-details" open>
              <summary>Ranked results</summary>
              <RankedTable rows={section.rows} />
            </details>
          </MetricCard>
        );
      })}
    </>
  );
}

export function DashboardsPage() {
  const { dashboardType } = useParams<{ dashboardType?: string }>();
  const navigate = useNavigate();

  const activeGameType: DashboardGameType =
    dashboardType === "ftl" || dashboardType === "fight-the-landlord"
      ? "fight-the-landlord"
      : "basketball";

  return (
    <section className="stack-lg">
      <div className="filter-row" role="tablist" aria-label="Dashboard game filters">
        {DASHBOARD_GAME_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              activeGameType === option.id
                ? "filter-toggle filter-toggle-active"
                : "filter-toggle"
            }
            onClick={() =>
              navigate(
                option.id === "basketball"
                  ? "/dashboards/basketball"
                  : "/dashboards/ftl",
              )
            }
          >
            <span className="filter-toggle-label">{option.name}</span>
          </button>
        ))}
      </div>

      {activeGameType === "basketball" ? (
        <BasketballDashboardView key="basketball" />
      ) : (
        <FtlDashboardView key="ftl" />
      )}
    </section>
  );
}
