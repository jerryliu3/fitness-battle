"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  SHELL_COLORS as c,
  buildAnalyticsLabModel,
  formatMinutesAsHoursMins,
  getDomainTitle,
  type AnalyticsDomainId,
  type AnalyticsLabModel,
  type AnalyticsTimeLens,
  type CompeteState,
  type VitalId,
} from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";
import { AppHeading, AppText, ListRow, SectionHeader, StatusBadge, typographyStyle } from "../../ui/section";
import { StandardLineChart } from "../../ui/standard-line-chart";

export { getDomainTitle };

const TIME_LENSES: readonly { id: AnalyticsTimeLens; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

export function TelemetryPage() {
  return (
    <Suspense fallback={<div className="club-detail-page"><p>Loading telemetry...</p></div>}>
      <TelemetryPageContent />
    </Suspense>
  );
}

function TelemetryPageContent() {
  const { state } = useCompete();
  const searchParams = useSearchParams();
  const rawDomain = searchParams.get("domain");

  const activeDomain: AnalyticsDomainId =
    rawDomain === "market" ||
    rawDomain === "vitals" ||
    rawDomain === "sleep" ||
    rawDomain === "load" ||
    rawDomain === "performance" ||
    rawDomain === "combined"
      ? rawDomain
      : "vitals";

  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const model = useMemo(
    () => buildAnalyticsLabModel(state, timeLens),
    [state, timeLens],
  );

  const title = getDomainTitle(activeDomain);

  return (
    <div className="club-detail-page" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header className="club-detail-heading">
        <Link href="/you" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <AppHeading level={1} role="display">{title}</AppHeading>
      </header>

      <div style={{ display: "flex", gap: 8 }}>
        {TIME_LENSES.map((l) => {
          const isActive = timeLens === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setTimeLens(l.id)}
              style={{
                ...typographyStyle("label"),
                padding: "6px 14px",
                borderRadius: 99,
                border: `1px solid ${isActive ? c.fieldTeal : c.line}`,
                backgroundColor: isActive ? c.fieldTeal : c.card,
                color: isActive ? "#ffffff" : c.ink,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      {activeDomain === "market" && <WebMarketView model={model} />}
      {activeDomain === "vitals" && <WebVitalsView model={model} />}
      {activeDomain === "sleep" && <WebSleepView model={model} />}
      {activeDomain === "load" && <WebLoadView model={model} />}
      {activeDomain === "performance" && <WebPerformanceView model={model} />}
      {activeDomain === "combined" && <WebCombinedView model={model} />}
    </div>
  );
}

/* ============================================================================
 * REUSABLE WEB PRIMITIVES
 * ========================================================================== */

function WebKpiGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string; color?: string }>;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 10 }}>
      {stats.map((st, i) => (
        <div key={i} style={{ background: c.soft, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <AppText role="label" secondary>{st.label}</AppText>
          <AppText role="value" style={st.color ? { color: st.color } : undefined}>
            {st.value}
          </AppText>
        </div>
      ))}
    </div>
  );
}

function WebInspectionCallout({
  title,
  badge,
  badgeTone = "neutral",
  value,
  detail,
  subtitle,
}: {
  title: string;
  badge?: string;
  badgeTone?: "neutral" | "success";
  value: string;
  detail?: string;
  subtitle?: string;
}) {
  return (
    <div style={{ background: c.soft, borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <AppText role="caption" secondary>{title}</AppText>
        {badge && <StatusBadge tone={badgeTone}>{badge}</StatusBadge>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
        <AppText role="value">{value}</AppText>
        {detail && <AppText role="caption" secondary>{detail}</AppText>}
      </div>
      {subtitle && <AppText role="caption" secondary style={{ marginTop: 2 }}>{subtitle}</AppText>}
    </div>
  );
}

/* ============================================================================
 * 1. WEB MARKET VIEW
 * ========================================================================== */

function WebMarketView({ model }: { model: AnalyticsLabModel }) {
  const m = model.market;
  const series = m.equitySeries;
  const [selectedIdx, setSelectedIdx] = useState(series.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, series.length - 1));
  const pt = series[safeIdx] ?? series[0]!;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <AppHeading level={2} role="heading">Equity Curve</AppHeading>
        <WebKpiGrid
          stats={[
            { label: "Current NAV", value: `${m.currentIndex.toLocaleString()} pts` },
            { label: "All-Time Return", value: `+${m.allTimeReturnPct}%`, color: c.statusSuccess },
            { label: "Max Drawdown", value: `${m.maxDrawdownPct}%`, color: c.statusError },
            { label: "4W SMA", value: `${series[series.length - 1]?.sma4 ?? 0} pts` },
          ]}
        />
        <StandardLineChart
          yAxisLabel="NAV (pts)"
          values={series.map((p) => p.nav)}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.tennis}
          xLabels={
            series.length >= 2
              ? [series[0]!.label, series[Math.floor(series.length / 2)]!.label, series[series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}`}
          ariaLabel="Equity curve portfolio net asset value history"
        />
        <WebInspectionCallout
          title={pt.label}
          badge={pt.drawdownPct === 0 ? "Peak NAV" : `${pt.drawdownPct}% Drawdown`}
          badgeTone={pt.drawdownPct === 0 ? "success" : "neutral"}
          value={`${pt.nav.toLocaleString()} pts`}
          detail={`${pt.volumeHours}h · +${pt.dividendPts} bonus pts`}
          subtitle={`4W SMA: ${pt.sma4} pts · 12W EMA: ${pt.ema12} pts`}
        />
      </div>

      <div className="fb-card">
        <AppHeading level={2} role="heading">Asset Holdings by Sport</AppHeading>
        <div style={{ marginTop: 8 }}>
          {m.holdings.map((h) => (
            <ListRow
              key={h.sport}
              title={h.sport}
              subtitle={`${h.hours} hrs · ${h.sharePct}% allocation`}
              trailing={
                <div style={{ textAlign: "right" }}>
                  <AppText role="body">{h.returnPts} pts</AppText>
                  <div>
                    <AppText role="caption" secondary>{h.yieldPerHour} pts/hr</AppText>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. WEB VITALS VIEW
 * ========================================================================== */

function WebVitalsView({ model }: { model: AnalyticsLabModel }) {
  const vitals = model.vitals.metrics;
  const [activeVitalId, setActiveVitalId] = useState<VitalId>("hrv");
  const vital = vitals.find((v) => v.id === activeVitalId) ?? vitals[0]!;
  const [selectedIdx, setSelectedIdx] = useState(vital.series.length - 1);

  const safeIdx = Math.max(0, Math.min(selectedIdx, vital.series.length - 1));
  const pt = vital.series[safeIdx] ?? vital.series[0]!;
  const inCorridor = pt.value >= pt.baselineLow && pt.value <= pt.baselineHigh;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <AppHeading level={2} role="heading">Autonomic Baseline Corridors</AppHeading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 10 }}>
          {vitals.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveVitalId(v.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "10px 12px",
                borderRadius: 8,
                background: c.soft,
                border: v.id === activeVitalId ? `1.5px solid ${c.fieldTeal}` : "1.5px solid transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <AppText role="caption" secondary>{v.shortName}</AppText>
              <AppText role="value">{v.formattedCurrent}</AppText>
              <div>
                <StatusBadge tone={v.status === "optimal" ? "success" : "neutral"}>
                  {v.statusLabel}
                </StatusBadge>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="fb-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <AppHeading level={2} role="heading">{vital.name}</AppHeading>
          <StatusBadge tone={vital.status === "optimal" ? "success" : "neutral"}>
            {vital.statusLabel}
          </StatusBadge>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "8px 0" }}>
          <AppText role="metric">{vital.formattedCurrent}</AppText>
          <AppText role="caption" secondary>
            Corridor: {vital.baselineMin}–{vital.baselineMax} {vital.unit}
          </AppText>
        </div>

        <StandardLineChart
          yAxisLabel={`${vital.name} (${vital.unit})`}
          values={vital.series.map((p) => p.value)}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          corridor={{
            high: vital.series.map((p) => p.baselineHigh),
            low: vital.series.map((p) => p.baselineLow),
          }}
          xLabels={
            vital.series.length >= 2
              ? [vital.series[0]!.label, vital.series[Math.floor(vital.series.length / 2)]!.label, vital.series[vital.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${vital.id === "temp" ? v.toFixed(1) : Math.round(v)}`}
          ariaLabel={`${vital.name} autonomic baseline corridor and value history`}
        />

        <WebInspectionCallout
          title={pt.label}
          badge={inCorridor ? "In Corridor" : "Out of Band"}
          badgeTone={inCorridor ? "success" : "neutral"}
          value={`${pt.value} ${vital.unit}`}
          detail={`Baseline: ${pt.baselineLow}–${pt.baselineHigh} ${vital.unit}`}
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * 3. WEB SLEEP VIEW
 * ========================================================================== */

function WebSleepView({ model }: { model: AnalyticsLabModel }) {
  const sData = model.sleep;
  const nights = sData.nights;
  const [selectedIdx, setSelectedIdx] = useState(nights.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, nights.length - 1));
  const night = nights[safeIdx] ?? sData.lastNight;

  const total = Math.max(1, night.durationMin);
  const deepP = (night.deepMin / total) * 100;
  const remP = (night.remMin / total) * 100;
  const lightP = (night.lightMin / total) * 100;
  const awakeP = (night.awakeMin / total) * 100;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <AppHeading level={2} role="heading">Sleep Architecture</AppHeading>
        <WebKpiGrid
          stats={[
            { label: "Avg Score", value: `${sData.avgScore} / 100` },
            { label: "Restorative %", value: `${sData.lastNight.restorativePct}%`, color: c.fieldTeal },
            { label: "Cumulative Debt", value: `${sData.cumulativeDebtMin}m`, color: sData.cumulativeDebtMin > 60 ? c.gold : c.ink },
            { label: "Efficiency", value: `${sData.lastNight.efficiencyPct}%` },
          ]}
        />
        <StandardLineChart
          yAxisLabel="Sleep score"
          values={nights.map((n) => n.score)}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          xLabels={
            nights.length >= 2
              ? [nights[0]!.label, nights[Math.floor(nights.length / 2)]!.label, nights[nights.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}`}
          ariaLabel="Nightly sleep score history"
        />
        <div style={{ background: c.soft, borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <AppText role="caption" secondary>{night.label}</AppText>
            <AppText role="value">{night.score} pts</AppText>
          </div>
          <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", margin: "4px 0" }}>
            <div style={{ width: `${deepP}%`, backgroundColor: c.fieldTeal }} />
            <div style={{ width: `${remP}%`, backgroundColor: c.tennis }} />
            <div style={{ width: `${lightP}%`, backgroundColor: c.ink }} />
            <div style={{ width: `${awakeP}%`, backgroundColor: c.gold }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <AppText role="caption" secondary>
              Deep {night.deepMin}m · REM {night.remMin}m · Light {night.lightMin}m
            </AppText>
            <AppText role="caption" style={{ color: night.debtMin > 0 ? c.gold : c.statusSuccess }}>
              {night.debtMin > 0 ? `+${night.debtMin}m debt` : "Surplus"}
            </AppText>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. WEB LOAD VIEW
 * ========================================================================== */

function WebLoadView({ model }: { model: AnalyticsLabModel }) {
  const l = model.load;
  const [selectedIdx, setSelectedIdx] = useState(l.series.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, l.series.length - 1));
  const b = l.series[safeIdx] ?? l.series[0]!;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <AppHeading level={2} role="heading">Workload Ratio (ACWR)</AppHeading>
        <WebKpiGrid
          stats={[
            { label: "Current ACWR", value: `${l.acwrCurrent.toFixed(2)}x`, color: c.statusSuccess },
            { label: "Acute (7D)", value: `${l.acuteHours7d} hrs` },
            { label: "Chronic (28D)", value: `${l.chronicHours28d} hrs` },
            { label: "Status", value: l.acwrStatusLabel, color: c.statusSuccess },
          ]}
        />
        <StandardLineChart
          yAxisLabel="ACWR (ratio)"
          values={l.series.map((s) => Number(s.acwr.toFixed(2)))}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.statusSuccess}
          xLabels={
            l.series.length >= 2
              ? [l.series[0]!.label, l.series[Math.floor(l.series.length / 2)]!.label, l.series[l.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${v.toFixed(1)}x`}
          ariaLabel="Workload ratio acute to chronic load ratio trend"
        />
        <WebInspectionCallout
          title={b.label}
          badge={`${b.acwr.toFixed(2)}x ACWR`}
          badgeTone={b.acwr >= 0.8 && b.acwr <= 1.3 ? "success" : "neutral"}
          value={`${b.acuteLoad} acute / ${b.chronicLoad} chronic`}
          detail={`${b.totalHours} hrs total`}
          subtitle={`Run ${b.runningHours}h · Bike ${b.cyclingHours}h · Strength ${b.strengthHours}h`}
        />
      </div>

      <div className="fb-card">
        <AppHeading level={2} role="heading">Period Volume Burn-Up</AppHeading>
        <StandardLineChart
          yAxisLabel="Training (hrs)"
          values={l.series.map((s) => s.cumCurrentHours)}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          height={130}
          xLabels={
            l.series.length >= 2
              ? [l.series[0]!.label, l.series[Math.floor(l.series.length / 2)]!.label, l.series[l.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}h`}
          ariaLabel="Cumulative period volume burn-up"
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * 5. WEB PERFORMANCE VIEW
 * ========================================================================== */

function WebPerformanceView({ model }: { model: AnalyticsLabModel }) {
  const p = model.performance;
  const [selectedIdx, setSelectedIdx] = useState(p.series.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, p.series.length - 1));
  const run = p.series[safeIdx] ?? p.series[0]!;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <AppHeading level={2} role="heading">Aerobic Efficiency (EF)</AppHeading>
        <WebKpiGrid
          stats={[
            { label: "Current EF", value: p.efCurrent.toFixed(2) },
            { label: "EF Delta", value: `+${p.efDeltaPct}% pace/HR`, color: c.fieldTeal },
            { label: "PR Count", value: `${p.prCurve.length} PRs` },
            { label: "Best Pace", value: `${p.series[0]?.paceMinKm.toFixed(2) ?? "4:30"} min/km` },
          ]}
        />
        <StandardLineChart
          yAxisLabel="EF (m/min/bpm)"
          values={p.series.map((s) => Number(s.efficiencyFactor.toFixed(2)))}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          xLabels={
            p.series.length >= 2
              ? [p.series[0]!.label, p.series[Math.floor(p.series.length / 2)]!.label, p.series[p.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => v.toFixed(2)}
          ariaLabel="Aerobic efficiency factor history"
        />
        <WebInspectionCallout
          title={run.label}
          badge={`${run.efficiencyFactor.toFixed(2)} EF`}
          badgeTone="success"
          value={`${run.paceMinKm.toFixed(2)} min/km pace`}
          detail={`Avg HR: ${run.avgHr} bpm · VO2 max: ${run.vo2Max}`}
        />
      </div>

      <div className="fb-card">
        <AppHeading level={2} role="heading">PR Staircase & Critical Pace</AppHeading>
        <div style={{ marginTop: 8 }}>
          {p.prCurve.map((pr) => (
            <ListRow
              key={pr.id}
              title={pr.distanceLabel}
              subtitle={`Prior ${pr.priorFormatted}`}
              trailing={
                <div style={{ textAlign: "right" }}>
                  <AppText role="body">{pr.currentFormatted}</AppText>
                  <div>
                    <AppText role="caption" style={{ color: c.statusSuccess }}>{pr.deltaFormatted}</AppText>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. WEB COMBINED VIEW
 * ========================================================================== */

function WebCombinedView({ model }: { model: AnalyticsLabModel }) {
  const cmb = model.combined;
  const [selectedIdx, setSelectedIdx] = useState(cmb.series.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, cmb.series.length - 1));
  const day = cmb.series[safeIdx] ?? cmb.series[0]!;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <AppHeading level={2} role="heading">Morning Readiness Brief</AppHeading>
        <WebKpiGrid
          stats={[
            { label: "Readiness", value: `${model.vitals.readinessComposite}%`, color: c.statusSuccess },
            { label: "Strain Ceiling", value: `${cmb.optimalStrainCeiling} / 21` },
            { label: "Sleep Score", value: `${model.sleep.lastNight.score} pts` },
            { label: "Bedtime Target", value: "10:30 PM" },
          ]}
        />
        <StandardLineChart
          yAxisLabel="Readiness (%)"
          values={cmb.series.map((s) => s.nextDayReadiness)}
          selectedIdx={safeIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.statusSuccess}
          xLabels={
            cmb.series.length >= 2
              ? [cmb.series[0]!.label, cmb.series[Math.floor(cmb.series.length / 2)]!.label, cmb.series[cmb.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}%`}
          ariaLabel="Morning readiness score history"
        />
        <WebInspectionCallout
          title={day.label}
          badge={`${day.nextDayReadiness}% Readiness`}
          badgeTone="success"
          value={`Strain: ${day.strainScore} / 21`}
          detail={`Next-Day HRV: ${day.nextDayHrv} ms`}
          subtitle={`${day.workoutNote} (${day.sleepRestorativeHr}h restorative sleep)`}
        />
      </div>
    </div>
  );
}
