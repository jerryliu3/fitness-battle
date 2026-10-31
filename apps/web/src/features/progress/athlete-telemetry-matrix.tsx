"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  SHELL_COLORS as c,
  buildAnalyticsLabModel,
  buildSvgLineGeometry,
  type AnalyticsDomainId,
  type AnalyticsTimeLens,
  type CompeteState,
} from "@fitness-battle/shared";
import { ChartSvg, ChartText } from "../../ui/chart-text";
import { AppHeading, AppText, typographyStyle } from "../../ui/section";

export function AthleteTelemetryMatrix({
  state,
}: {
  state?: CompeteState | null;
}) {
  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const model = useMemo(() => buildAnalyticsLabModel(state, timeLens), [state, timeLens]);

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
    corridor?: { high: number[]; low: number[] };
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
      domain: "vitals" as const,
      kicker: "Overnight HRV",
      value: model.vitals.metrics[0]?.formattedCurrent ?? "64 ms",
      delta: `${model.vitals.metrics[0]?.statusLabel ?? "Normal"} · Baseline ${model.vitals.metrics[0]?.baselineMin ?? 62}–${model.vitals.metrics[0]?.baselineMax ?? 82} ms`,
      points: model.vitals.metrics[0]?.series.map((p) => p.value) ?? [60, 62, 65, 64, 66, 63, 64],
      accent: c.fieldTeal,
      corridor: model.vitals.metrics[0]
        ? {
            high: model.vitals.metrics[0].series.map((p) => p.baselineHigh),
            low: model.vitals.metrics[0].series.map((p) => p.baselineLow),
          }
        : undefined,
    },
    {
      id: "sleep",
      domain: "sleep" as const,
      kicker: "Sleep & Debt",
      value: `${model.sleep.lastNight.score} pts`,
      delta: `${model.sleep.lastNight.restorativePct}% restorative · +${model.sleep.lastNight.debtMin}m debt`,
      points: model.sleep.nights.map((n) => n.score),
      accent: c.fieldTeal,
    },
    {
      id: "load",
      domain: "load" as const,
      kicker: "Workload Ratio",
      value: `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: model.load.acwrStatusLabel,
      points: model.load.series.map((b) => b.acwr),
      accent: c.tennis,
    },
    {
      id: "performance",
      domain: "performance" as const,
      kicker: "Aerobic Efficiency",
      value: model.performance.efCurrent.toFixed(2),
      delta: `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: model.performance.series.map((p) => p.efficiencyFactor),
      accent: c.tennis,
    },
    {
      id: "combined",
      domain: "combined" as const,
      kicker: "Readiness Brief",
      value: `${model.vitals.readinessComposite}%`,
      delta: `Strain ceiling: ${model.combined.optimalStrainCeiling} / 21`,
      points: model.combined.series.map((s) => s.nextDayReadiness),
      accent: c.fieldTeal,
    },
  ];

  return (
    <section aria-label="Advanced Analytics Telemetry">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <AppHeading role="heading" level={2}>Advanced Analytics</AppHeading>
          <div style={{ display: "flex", gap: 6 }} role="group" aria-label="Time range">
            {(["7d", "30d"] as const).map((lens) => {
              const active = timeLens === lens;
              return (
                <button
                  key={lens}
                  type="button"
                  onClick={() => setTimeLens(lens)}
                  aria-pressed={active}
                  style={{
                    ...typographyStyle("caption"),
                    padding: "4px 10px",
                    borderRadius: 99,
                    border: `1px solid ${active ? c.fieldTeal : c.line}`,
                    backgroundColor: active ? c.fieldTeal : "transparent",
                    color: active ? "#ffffff" : c.muted,
                    cursor: "pointer",
                  }}
                >
                  {lens.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {bentoTiles.map((t) => (
            <Link
              key={t.id}
              href={`/you/telemetry?domain=${t.domain}${timeLens !== "30d" ? `&lens=${timeLens}` : ""}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 14,
                borderRadius: 14,
                border: `1px solid ${c.line}`,
                backgroundColor: c.card,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <AppText role="label" secondary>
                {t.kicker}
              </AppText>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <AppText role="value">{t.value}</AppText>
  
              </div>

              <MiniSparklineSvg values={t.points} stroke={t.accent} corridor={t.corridor} labels={datesByDomain[t.domain]} />
              <AppText
                role="caption"
                secondary
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
  corridor,
}: {
  values: number[];
  stroke: string;
  labels?: string[];
  corridor?: { high: number[]; low: number[] };
}) {
  if (values.length < 2) return null;
  const all = corridor ? [...values, ...corridor.high, ...corridor.low] : values;
  const low = Math.min(...all), high = Math.max(...all);
  const geometry = buildSvgLineGeometry(values, 78, 28, 2, { min: low, max: high });
  const polyline = geometry.polyline;
  const points = geometry.points.map((point, i) => ({ ...point, val: values[i]! }));
  const ticks = [...new Set([low, high])].map(value => ({ value, y: 26 - (value-low)/(high-low || 1)*24 }));
  const number = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Number(value.toPrecision(3)).toString();
  return (
    <ChartSvg width={110} height={50} viewBox="0 0 110 50" aria-hidden="true">
      {ticks.map(tick => <g key={tick.value}><line x1={30} x2={104} y1={tick.y} y2={tick.y} stroke={c.line}/><ChartText x={26} y={tick.y+3} textAnchor="end" fill={c.muted}>{number(tick.value)}</ChartText></g>)}
      {labels[0] && <ChartText x={30} y={46} fill={c.muted}>{labels[0]}</ChartText>}
      {labels.at(-1) && <ChartText x={104} y={46} textAnchor="end" fill={c.muted}>{labels.at(-1)}</ChartText>}
      <g transform="translate(28 0)">
{corridor && <path d={`M ${corridor.high.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).join(" L ")} L ${corridor.low.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).reverse().join(" L ")} Z`} fill={stroke} opacity={.16}/>}
{corridor && <polyline points={corridor.high.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).join(" ")} fill="none" stroke={stroke} opacity={.65}/>}
      {corridor && <polyline points={corridor.low.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).join(" ")} fill="none" stroke={stroke} opacity={.65}/>}
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
    </ChartSvg>
  );
}
