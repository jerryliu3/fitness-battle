"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  SHELL_COLORS as c,
  buildAnalyticsLabModel,
  buildSvgLineGeometry,
  type AnalyticsDomainId,
  type CompeteState,
} from "@fitness-battle/shared";
import { AppHeading, AppText } from "../../ui/section";

export function AthleteTelemetryMatrix({
  state,
}: {
  state?: CompeteState | null;
}) {
  const model = useMemo(() => buildAnalyticsLabModel(state, "30d"), [state]);

  const SHOW_ATHLETE_EQUITY = false;
  const datesByDomain = {
    market: model.market.equitySeries.map(p => p.label),
    vitals: model.vitals.metrics[0]?.series.map(p => p.label) ?? [],
    sleep: model.sleep.nights.map(p => p.label),
    load: model.load.series.map(p => p.label),
    performance: model.performance.series.map(p => p.label),
    combined: model.combined.series.map(p => p.label),
  };


  const bentoTiles: Array<{
    id: string;
    domain: AnalyticsDomainId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
  }> = [
    ...(SHOW_ATHLETE_EQUITY
      ? [
          {
            id: "market",
            domain: "market" as const,
            kicker: "Athlete Equity",
            value: `${model.market.currentIndex.toLocaleString()} pts`,
            delta: `+${model.market.allTimeReturnPct}% all-time`,
            points: model.market.equitySeries.map((p) => p.nav),
            accent: c.tennis,
          },
        ]
      : []),
    {
      id: "vitals",
      domain: "vitals",
      kicker: "Overnight HRV",
      value: model.vitals.metrics[0]!.formattedCurrent,
      delta: `${model.vitals.metrics[0]!.statusLabel} corridor`,
      points: model.vitals.metrics[0]!.series.map((p) => p.value),
      accent: c.tennis,
    },
    {
      id: "sleep",
      domain: "sleep",
      kicker: "Sleep & Debt",
      value: `${model.sleep.lastNight.score} score`,
      delta: `${model.sleep.lastNight.restorativePct}% restorative · ${model.sleep.lastNight.debtMin}m debt`,
      points: model.sleep.nights.map((n) => n.score),
      accent: c.tennis,
    },
    {
      id: "load",
      domain: "load",
      kicker: "Workload Ratio",
      value: `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: model.load.acwrStatusLabel,
      points: model.load.series.map((b) => b.acwr),
      accent: c.tennis,
    },
    {
      id: "performance",
      domain: "performance",
      kicker: "Aerobic Efficiency",
      value: model.performance.efCurrent.toFixed(2),
      delta: `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: model.performance.series.map((p) => p.efficiencyFactor),
      accent: c.tennis,
    },
    {
      id: "combined",
      domain: "combined",
      kicker: "Readiness Brief",
      value: `${model.vitals.readinessComposite}%`,
      delta: `Strain ceiling ${model.combined.optimalStrainCeiling}`,
      points: model.combined.series.map((s) => s.nextDayReadiness),
      accent: c.tennis,
    },
  ];

  return (
    <section className="athlete-telemetry-matrix fb-stack" style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <AppHeading role="heading" level={2}>Advanced Analytics</AppHeading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {bentoTiles.map((t) => (
            <Link
              key={t.id}
              href={`/you/telemetry?domain=${t.domain}`}
              aria-label={`${t.kicker}, ${t.value}, ${t.delta}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "14px 14px 12px",
                background: "var(--fb-card, #ffffff)",
                border: "1px solid var(--fb-line, #e5eae6)",
                borderRadius: 12,
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                transition: "border-color 0.15s, transform 0.15s",
              }}
            >
              <AppText role="label" secondary>
                {t.kicker}
              </AppText>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <AppText role="value">{t.value}</AppText>
              </div>

              <MiniSparklineSvg values={t.points} stroke={t.accent} labels={datesByDomain[t.domain]} />
              <AppText
                role="caption"
                secondary
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.delta}
              </AppText>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniSparklineSvg({
  values,
  stroke,
  labels = [],
}: {
  values: number[];
  stroke: string;
  labels?: string[];
}) {
  if (values.length < 2) return null;
  const low = Math.min(...values), high = Math.max(...values);
  const geometry = buildSvgLineGeometry(values.map(value => (value - low) / (high - low || 1)), 78, 28, 2);
  const polyline = geometry.polyline;
  const points = geometry.points.map((point, i) => ({ ...point, val: values[i]! }));
  const ticks = [...new Set([low, high])].map(value => ({ value, y: points.find(p => p.val === value)!.y }));
  const number = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Number(value.toPrecision(3)).toString();
  return (
    <svg width={110} height={50} viewBox="0 0 110 50" aria-hidden="true">
      {ticks.map(tick => <g key={tick.value}><line x1={30} x2={104} y1={tick.y} y2={tick.y} stroke={c.line}/><text x={26} y={tick.y+3} fontSize={9} textAnchor="end" fill={c.muted}>{number(tick.value)}</text></g>)}
      {labels[0] && <text x={30} y={46} fontSize={9} fill={c.muted}>{labels[0]}</text>}
      {labels.at(-1) && <text x={104} y={46} fontSize={9} textAnchor="end" fill={c.muted}>{labels.at(-1)}</text>}
      <g transform="translate(28 0)">
      <path
        d={`M ${polyline}`}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={stroke} />
      ))}
      </g>
    </svg>
  );
}
