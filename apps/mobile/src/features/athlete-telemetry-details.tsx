import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
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
import { AppText, ListRow, SectionHeader, StatusBadge, Surface } from "../ui/section";
import { FocusSegments, f } from "../ui/focus";
import { StandardLineChart } from "../ui/standard-line-chart";

export { getDomainTitle };

const TIME_LENSES: readonly { value: AnalyticsTimeLens; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
];

export function AthleteTelemetryDetails({
  domain = "vitals",
  state,
}: {
  domain?: AnalyticsDomainId | string;
  state?: CompeteState | null;
}) {
  const activeDomain: AnalyticsDomainId =
    domain === "market" ||
    domain === "vitals" ||
    domain === "sleep" ||
    domain === "load" ||
    domain === "performance" ||
    domain === "combined"
      ? domain
      : "vitals";

  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const model = useMemo(
    () => buildAnalyticsLabModel(state, timeLens),
    [state, timeLens],
  );

  return (
    <ScrollView contentContainerStyle={s.content}>
      <FocusSegments
        label="Time range"
        value={timeLens}
        options={TIME_LENSES}
        onChange={setTimeLens}
      />

      {activeDomain === "market" && <MarketView model={model} />}
      {activeDomain === "vitals" && <VitalsView model={model} />}
      {activeDomain === "sleep" && <SleepView model={model} />}
      {activeDomain === "load" && <LoadView model={model} />}
      {activeDomain === "performance" && <PerformanceView model={model} />}
      {activeDomain === "combined" && <CombinedView model={model} />}
    </ScrollView>
  );
}

export const AthleteTelemetryDetailView = AthleteTelemetryDetails;

/* ============================================================================
 * REUSABLE TELEMETRY PRIMITIVES
 * ========================================================================== */

function KpiGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string; color?: string }>;
}) {
  return (
    <View style={s.kpiGrid}>
      {stats.map((st, i) => (
        <Surface key={i} style={s.kpiCell}>
          <AppText role="label" secondary>{st.label}</AppText>
          <AppText role="value" style={st.color ? { color: st.color } : undefined}>
            {st.value}
          </AppText>
        </Surface>
      ))}
    </View>
  );
}

function InspectionCallout({
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
    <Surface style={s.inspectionBox}>
      <View style={s.betweenRow}>
        <AppText role="caption" secondary>{title}</AppText>
        {badge && <StatusBadge tone={badgeTone}>{badge}</StatusBadge>}
      </View>
      <View style={[s.betweenRow, { marginTop: 4 }]}>
        <AppText role="value">{value}</AppText>
        {detail && <AppText role="caption" secondary>{detail}</AppText>}
      </View>
      {subtitle && <AppText role="caption" secondary style={{ marginTop: 2 }}>{subtitle}</AppText>}
    </Surface>
  );
}

/* ============================================================================
 * 1. ATHLETE MARKET VIEW
 * ========================================================================== */

function MarketView({ model }: { model: AnalyticsLabModel }) {
  const m = model.market;
  const series = m.equitySeries;
  const [selectedIdx, setSelectedIdx] = useState(series.length - 1);
  const pt = series[Math.max(0, Math.min(selectedIdx, series.length - 1))] ?? series[0]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <SectionHeader title="Equity Curve" />
        <KpiGrid
          stats={[
            { label: "Current NAV", value: `${m.currentIndex.toLocaleString()} pts` },
            { label: "All-Time Return", value: `+${m.allTimeReturnPct}%`, color: c.statusSuccess },
            { label: "Max Drawdown", value: `${m.maxDrawdownPct}%`, color: c.statusError },
            { label: "4W SMA", value: `${series[series.length - 1]?.sma4 ?? 0} pts` },
          ]}
        />
        <StandardLineChart
          values={series.map((p) => p.nav)}
          selectedIdx={selectedIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.tennis}
          xLabels={
            series.length >= 2
              ? [series[0]!.label, series[Math.floor(series.length / 2)]!.label, series[series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}`}
          accessibilityLabel="Equity curve portfolio net asset value history"
        />
        <InspectionCallout
          title={pt.label}
          badge={pt.drawdownPct === 0 ? "Peak NAV" : `${pt.drawdownPct}% Drawdown`}
          badgeTone={pt.drawdownPct === 0 ? "success" : "neutral"}
          value={`${pt.nav.toLocaleString()} pts`}
          detail={`${pt.volumeHours}h · +${pt.dividendPts} bonus pts`}
          subtitle={`4W SMA: ${pt.sma4} pts · 12W EMA: ${pt.ema12} pts`}
        />
      </View>

      <View style={f.card}>
        <SectionHeader title="Asset Holdings by Sport" />
        <View style={{ marginTop: 6 }}>
          {m.holdings.map((h) => (
            <ListRow
              key={h.sport}
              title={h.sport}
              subtitle={`${h.hours} hrs · ${h.sharePct}% allocation`}
              trailing={
                <View style={{ alignItems: "flex-end" }}>
                  <AppText role="body">{h.returnPts} pts</AppText>
                  <AppText role="caption" secondary>{h.yieldPerHour} pts/hr</AppText>
                </View>
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 2. AUTONOMIC VITALS VIEW
 * ========================================================================== */

function VitalsView({ model }: { model: AnalyticsLabModel }) {
  const vitals = model.vitals.metrics;
  const [activeVitalId, setActiveVitalId] = useState<VitalId>("hrv");
  const vital = vitals.find((v) => v.id === activeVitalId) ?? vitals[0]!;
  const [selectedIdx, setSelectedIdx] = useState(vital.series.length - 1);

  const safeIdx = Math.max(0, Math.min(selectedIdx, vital.series.length - 1));
  const pt = vital.series[safeIdx] ?? vital.series[0]!;
  const inCorridor = pt.value >= pt.baselineLow && pt.value <= pt.baselineHigh;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <SectionHeader title="Autonomic Baseline Corridors" />
        <View style={s.vitalsGrid}>
          {vitals.map((v) => (
            <Pressable
              key={v.id}
              accessibilityRole="button"
              accessibilityLabel={`${v.name}, ${v.formattedCurrent}`}
              onPress={() => setActiveVitalId(v.id)}
              style={[s.vitalChip, v.id === activeVitalId && s.vitalChipActive]}
            >
              <AppText role="caption" secondary>{v.shortName}</AppText>
              <AppText role="value">{v.formattedCurrent}</AppText>
              <StatusBadge tone={v.status === "optimal" ? "success" : "neutral"}>
                {v.statusLabel}
              </StatusBadge>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={f.card}>
        <View style={s.betweenRow}>
          <SectionHeader title={vital.name} />
          <StatusBadge tone={vital.status === "optimal" ? "success" : "neutral"}>
            {vital.statusLabel}
          </StatusBadge>
        </View>
        <View style={[s.betweenRow, { marginVertical: 6 }]}>
          <AppText role="metric">{vital.formattedCurrent}</AppText>
          <AppText role="caption" secondary>
            Corridor: {vital.baselineMin}–{vital.baselineMax} {vital.unit}
          </AppText>
        </View>

        <StandardLineChart
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
          accessibilityLabel={`${vital.name} autonomic baseline corridor and value history`}
        />

        <InspectionCallout
          title={pt.label}
          badge={inCorridor ? "In Corridor" : "Out of Band"}
          badgeTone={inCorridor ? "success" : "neutral"}
          value={`${pt.value} ${vital.unit}`}
          detail={`Baseline: ${pt.baselineLow}–${pt.baselineHigh} ${vital.unit}`}
        />
      </View>
    </View>
  );
}

/* ============================================================================
 * 3. SLEEP & RECOVERY VIEW
 * ========================================================================== */

function SleepView({ model }: { model: AnalyticsLabModel }) {
  const sData = model.sleep;
  const nights = sData.nights;
  const [selectedIdx, setSelectedIdx] = useState(nights.length - 1);
  const night = nights[Math.max(0, Math.min(selectedIdx, nights.length - 1))] ?? sData.lastNight;

  const total = Math.max(1, night.durationMin);
  const deepP = (night.deepMin / total) * 100;
  const remP = (night.remMin / total) * 100;
  const lightP = (night.lightMin / total) * 100;
  const awakeP = (night.awakeMin / total) * 100;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <SectionHeader title="Sleep & Recovery Architecture" />
        <KpiGrid
          stats={[
            { label: "Avg Score", value: `${sData.avgScore} / 100` },
            { label: "Restorative %", value: `${sData.lastNight.restorativePct}%`, color: c.fieldTeal },
            { label: "Cumulative Debt", value: `${sData.cumulativeDebtMin}m`, color: sData.cumulativeDebtMin > 60 ? c.gold : c.ink },
            { label: "Efficiency", value: `${sData.lastNight.efficiencyPct}%` },
          ]}
        />
        <StandardLineChart
          values={nights.map((n) => n.score)}
          selectedIdx={selectedIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          xLabels={
            nights.length >= 2
              ? [nights[0]!.label, nights[Math.floor(nights.length / 2)]!.label, nights[nights.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}`}
          accessibilityLabel="Nightly sleep score history"
        />
        <Surface style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <AppText role="caption" secondary>{night.label}</AppText>
            <AppText role="value">{night.score} pts</AppText>
          </View>
          <View style={s.stageRibbon}>
            <View style={{ width: `${deepP}%`, backgroundColor: c.fieldTeal }} />
            <View style={{ width: `${remP}%`, backgroundColor: c.tennis }} />
            <View style={{ width: `${lightP}%`, backgroundColor: c.ink }} />
            <View style={{ width: `${awakeP}%`, backgroundColor: c.gold }} />
          </View>
          <View style={s.betweenRow}>
            <AppText role="caption" secondary>
              Deep {night.deepMin}m · REM {night.remMin}m · Light {night.lightMin}m
            </AppText>
            <AppText role="caption" style={{ color: night.debtMin > 0 ? c.gold : c.statusSuccess }}>
              {night.debtMin > 0 ? `+${night.debtMin}m debt` : "Surplus"}
            </AppText>
          </View>
        </Surface>
      </View>
    </View>
  );
}

/* ============================================================================
 * 4. WORKLOAD RATIO (ACWR) VIEW
 * ========================================================================== */

function LoadView({ model }: { model: AnalyticsLabModel }) {
  const l = model.load;
  const [selectedIdx, setSelectedIdx] = useState(l.series.length - 1);
  const b = l.series[Math.max(0, Math.min(selectedIdx, l.series.length - 1))] ?? l.series[0]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <SectionHeader title="Workload Ratio (ACWR)" />
        <KpiGrid
          stats={[
            { label: "Current ACWR", value: `${l.acwrCurrent.toFixed(2)}x`, color: c.statusSuccess },
            { label: "Acute (7D)", value: `${l.acuteHours7d} hrs` },
            { label: "Chronic (28D)", value: `${l.chronicHours28d} hrs` },
            { label: "Status", value: l.acwrStatusLabel, color: c.statusSuccess },
          ]}
        />
        <StandardLineChart
          values={l.series.map((s) => Number(s.acwr.toFixed(2)))}
          selectedIdx={selectedIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.statusSuccess}
          xLabels={
            l.series.length >= 2
              ? [l.series[0]!.label, l.series[Math.floor(l.series.length / 2)]!.label, l.series[l.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${v.toFixed(1)}x`}
          accessibilityLabel="Workload ratio acute to chronic load ratio trend"
        />
        <InspectionCallout
          title={b.label}
          badge={`${b.acwr.toFixed(2)}x ACWR`}
          badgeTone={b.acwr >= 0.8 && b.acwr <= 1.3 ? "success" : "neutral"}
          value={`${b.acuteLoad} acute / ${b.chronicLoad} chronic`}
          detail={`${b.totalHours} hrs total`}
          subtitle={`Run ${b.runningHours}h · Bike ${b.cyclingHours}h · Strength ${b.strengthHours}h`}
        />
      </View>

      <View style={f.card}>
        <SectionHeader title="Period Volume Burn-Up" />
        <StandardLineChart
          values={l.series.map((s) => s.cumCurrentHours)}
          selectedIdx={selectedIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          height={130}
          xLabels={
            l.series.length >= 2
              ? [l.series[0]!.label, l.series[Math.floor(l.series.length / 2)]!.label, l.series[l.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}h`}
          accessibilityLabel="Cumulative period volume burn-up"
        />
      </View>
    </View>
  );
}

/* ============================================================================
 * 5. CARDIO & PACE (AEROBIC EFFICIENCY) VIEW
 * ========================================================================== */

function PerformanceView({ model }: { model: AnalyticsLabModel }) {
  const p = model.performance;
  const [selectedIdx, setSelectedIdx] = useState(p.series.length - 1);
  const run = p.series[Math.max(0, Math.min(selectedIdx, p.series.length - 1))] ?? p.series[0]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <SectionHeader title="Aerobic Efficiency (EF)" />
        <KpiGrid
          stats={[
            { label: "Current EF", value: p.efCurrent.toFixed(2) },
            { label: "EF Delta", value: `+${p.efDeltaPct}% pace/HR`, color: c.fieldTeal },
            { label: "PR Count", value: `${p.prCurve.length} PRs` },
            { label: "Best Pace", value: `${p.series[0]?.paceMinKm.toFixed(2) ?? "4:30"} min/km` },
          ]}
        />
        <StandardLineChart
          values={p.series.map((s) => Number(s.efficiencyFactor.toFixed(2)))}
          selectedIdx={selectedIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.fieldTeal}
          xLabels={
            p.series.length >= 2
              ? [p.series[0]!.label, p.series[Math.floor(p.series.length / 2)]!.label, p.series[p.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => v.toFixed(2)}
          accessibilityLabel="Aerobic efficiency factor history"
        />
        <InspectionCallout
          title={run.label}
          badge={`${run.efficiencyFactor.toFixed(2)} EF`}
          badgeTone="success"
          value={`${run.paceMinKm.toFixed(2)} min/km pace`}
          detail={`Avg HR: ${run.avgHr} bpm · VO2 max: ${run.vo2Max}`}
        />
      </View>

      <View style={f.card}>
        <SectionHeader title="PR Staircase & Critical Pace" />
        <View style={{ marginTop: 6 }}>
          {p.prCurve.map((pr) => (
            <ListRow
              key={pr.id}
              title={pr.distanceLabel}
              subtitle={`Prior ${pr.priorFormatted}`}
              trailing={
                <View style={{ alignItems: "flex-end" }}>
                  <AppText role="body">{pr.currentFormatted}</AppText>
                  <AppText role="caption" style={{ color: c.statusSuccess }}>{pr.deltaFormatted}</AppText>
                </View>
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 6. MULTI-METRIC SYNTHESIS VIEW
 * ========================================================================== */

function CombinedView({ model }: { model: AnalyticsLabModel }) {
  const cmb = model.combined;
  const [selectedIdx, setSelectedIdx] = useState(cmb.series.length - 1);
  const day = cmb.series[Math.max(0, Math.min(selectedIdx, cmb.series.length - 1))] ?? cmb.series[0]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <SectionHeader title="Morning Readiness Brief" />
        <KpiGrid
          stats={[
            { label: "Readiness", value: `${model.vitals.readinessComposite}%`, color: c.statusSuccess },
            { label: "Strain Ceiling", value: `${cmb.optimalStrainCeiling} / 21` },
            { label: "Sleep Score", value: `${model.sleep.lastNight.score} pts` },
            { label: "Bedtime Target", value: "10:30 PM" },
          ]}
        />
        <StandardLineChart
          values={cmb.series.map((s) => s.nextDayReadiness)}
          selectedIdx={selectedIdx}
          onSelectIdx={setSelectedIdx}
          stroke={c.statusSuccess}
          xLabels={
            cmb.series.length >= 2
              ? [cmb.series[0]!.label, cmb.series[Math.floor(cmb.series.length / 2)]!.label, cmb.series[cmb.series.length - 1]!.label]
              : undefined
          }
          formatY={(v) => `${Math.round(v)}%`}
          accessibilityLabel="Morning readiness score history"
        />
        <InspectionCallout
          title={day.label}
          badge={`${day.nextDayReadiness}% Readiness`}
          badgeTone="success"
          value={`Strain: ${day.strainScore} / 21`}
          detail={`Next-Day HRV: ${day.nextDayHrv} ms`}
          subtitle={`${day.workoutNote} (${day.sleepRestorativeHr}h restorative sleep)`}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  kpiCell: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: c.soft,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  inspectionBox: {
    backgroundColor: c.soft,
    borderRadius: 8,
    padding: 12,
    gap: 4,
    marginTop: 8,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  vitalChip: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: c.soft,
    borderRadius: 8,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  vitalChipActive: {
    borderColor: c.fieldTeal,
    borderWidth: 1.5,
  },
  stageRibbon: {
    flexDirection: "row",
    height: 16,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 6,
  },
  betweenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
