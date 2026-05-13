import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { buildBasketballDashboardMetricsFromData } from "../features/dashboards/basketball/compute";
import {
  METRIC_META,
  NBA_COMPARISON_SECTION_TITLE,
} from "../features/dashboards/basketball/constants";
import type {
  DashboardMetricSection,
  DashboardMetricSplitSection,
} from "../features/dashboards/basketball/types";
import { MetricCard } from "../features/dashboards/components/MetricCard";
import { NbaComparisonTable } from "../features/dashboards/components/NbaComparisonTable";
import { RankedTable } from "../features/dashboards/components/RankedTable";
import { fetchBasketballDashboardData } from "../lib/api/read";

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

export function DashboardsPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboards", "basketball"],
    queryFn: fetchBasketballDashboardData,
  });

  const metrics = useMemo(() => {
    if (!dashboardQuery.data) return null;
    return buildBasketballDashboardMetricsFromData(dashboardQuery.data);
  }, [dashboardQuery.data]);

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

  if (dashboardQuery.isLoading) {
    return (
      <section className="stack-lg">
        <div className="inline-actions space-between">
          <Link to="/leaderboards" className="secondary-button link-button">
            Back to leaderboards
          </Link>
        </div>
        <article className="card stack-sm">
          <p className="card-eyebrow">Dashboards</p>
          <h2>Basketball analytics</h2>
          <p className="muted">Loading basketball dashboards...</p>
        </article>
      </section>
    );
  }

  if (dashboardQuery.isError || !metrics) {
    return (
      <section className="stack-lg">
        <div className="inline-actions space-between">
          <Link to="/leaderboards" className="secondary-button link-button">
            Back to leaderboards
          </Link>
        </div>
        <article className="card stack-sm">
          <p className="card-eyebrow">Dashboards</p>
          <h2>Basketball analytics</h2>
          <p className="form-error">
            {dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : "Unable to load dashboard data."}
          </p>
        </article>
      </section>
    );
  }

  const splitSectionsById = new Map(
    metrics.splitSections.map((section) => [section.id, section]),
  );
  const sectionsById = new Map(metrics.sections.map((section) => [section.id, section]));

  return (
    <section className="stack-lg">
      <div className="inline-actions space-between">
        <Link to="/leaderboards" className="secondary-button link-button">
          Back to leaderboards
        </Link>
        <span className="pill">
          {metrics.diagnostics.eligibleRounds} rounds analyzed
        </span>
      </div>

      <article className="card stack-sm">
        <p className="card-eyebrow">Dashboards</p>
        <h2>Basketball analytics</h2>
        <p className="muted">
          Mobile-friendly, sample-aware stats built from round snapshots and player deltas.
        </p>
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
        <p className="card-eyebrow">Jump to section</p>
        <div className="inline-actions">
          {sectionOrder.map((id) => (
            <a key={id} className="filter-chip" href={`#dashboard-${id}`}>
              {id}
            </a>
          ))}
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
    </section>
  );
}
