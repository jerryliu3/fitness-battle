"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildAnalyticsLabModel,
  type AnalyticsDomainId,
  type CompeteState,
  type VitalId,
} from "@fitness-battle/shared";

const c = {
  ink: "#142b3b",
  card: "#ffffff",
  line: "#e5eae6",
  fieldTeal: "#176c75",
  tennis: "#f7c948",
  statusSuccess: "#24765c",
  muted: "#637482",
  secondary: "#3e5263",
};

export function AthleteTelemetryMatrix({
  state: _state,
}: {
  state?: CompeteState;
}) {
  const model = useMemo(() => buildAnalyticsLabModel("peak_build", "30d"), []);

  const bentoTiles: Array<{
    id: string;
    domain: AnalyticsDomainId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
    vitalId?: VitalId;
  }> = [
    {
      id: "market",
      domain: "market",
      kicker: "Athlete Equity",
      value: `${model.market.currentIndex.toLocaleString()} pts`,
      delta: `+${model.market.allTimeReturnPct}% all-time`,
      points: model.market.equitySeries.map((p) => p.nav),
      accent: c.tennis,
    },
    {
      id: "vitals",
      domain: "vitals",
      vitalId: "hrv",
      kicker: "Overnight HRV",
      value: model.vitals.metrics[0]!.formattedCurrent,
      delta: `${model.vitals.metrics[0]!.statusLabel} corridor`,
      points: model.vitals.metrics[0]!.series.map((p) => p.value),
      accent: c.fieldTeal,
    },
    {
      id: "sleep",
      domain: "sleep",
      kicker: "Sleep & Debt",
      value: `${model.sleep.lastNight.score} score`,
      delta: `${model.sleep.lastNight.restorativePct}% restorative · ${model.sleep.lastNight.debtMin}m debt`,
      points: model.sleep.nights.map((n) => n.score),
      accent: c.ink,
    },
    {
      id: "load",
      domain: "load",
      kicker: "Workload Ratio",
      value: `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: model.load.acwrStatusLabel,
      points: model.load.series.map((b) => b.acwr * 100),
      accent: c.statusSuccess,
    },
    {
      id: "performance",
      domain: "performance",
      kicker: "Aerobic Efficiency",
      value: model.performance.efCurrent.toFixed(2),
      delta: `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: model.performance.series.map((p) => p.efficiencyFactor * 100),
      accent: c.fieldTeal,
    },
    {
      id: "combined",
      domain: "combined",
      kicker: "Readiness Brief",
      value: `${model.vitals.readinessComposite}%`,
      delta: `Strain ceiling ${model.combined.optimalStrainCeiling}`,
      points: model.combined.series.map((s) => s.nextDayReadiness),
      accent: c.statusSuccess,
    },
  ];

  return (
    <section className="athlete-telemetry-matrix fb-stack" style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <h2 className="fb-section-title">Athlete Telemetry Matrix</h2>

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
              <span
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--fb-muted, #637482)",
                }}
              >
                {t.kicker}
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--fb-ink, #142b3b)",
                  }}
                >
                  {t.value}
                </span>
                <MiniSparklineSvg values={t.points} stroke={t.accent} />
              </div>

              <span
                className="fb-small"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "var(--fb-secondary, #3e5263)",
                }}
              >
                {t.delta}
              </span>
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
}: {
  values: number[];
  stroke: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const W = 58;
  const H = 22;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path
        d={`M ${pts}`}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
