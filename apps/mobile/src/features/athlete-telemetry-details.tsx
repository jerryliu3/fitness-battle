import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  buildAnalyticsLabModel,
  formatMinutesAsHoursMins,
  type AnalyticsDomainId,
  type AnalyticsLabModel,
  type VitalId,
  type VitalMetricModel,
} from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { fonts } from "../theme";

const c = {
  ink: "#142b3b",
  paper: "#f8f9f6",
  card: "#ffffff",
  line: "#e5eae6",
  soft: "#eef3ef",
  fieldTeal: "#176c75",
  tennis: "#f7c948",
  statusSuccess: "#24765c",
  statusSuccessSoft: "#e2f2eb",
  statusWarning: "#c77700",
  statusWarningSoft: "#fff3db",
  statusError: "#b93826",
  statusErrorSoft: "#fce9e6",
  muted: "#637482",
  secondary: "#3e5263",
};

export function getDomainTitle(domain?: AnalyticsDomainId | string | null): string {
  switch (domain) {
    case "market":
      return "Athlete Market";
    case "vitals":
      return "Autonomic Vitals";
    case "sleep":
      return "Sleep & Recovery";
    case "load":
      return "Workload Ratio";
    case "performance":
      return "Cardio & Pace";
    case "combined":
      return "Readiness Brief";
    default:
      return "Athlete Telemetry";
  }
}

export function AthleteTelemetryDetailView({
  domain,
}: {
  domain?: AnalyticsDomainId | string;
}) {
  const model = useMemo(() => buildAnalyticsLabModel("peak_build", "30d"), []);
  const activeDomain = (domain as AnalyticsDomainId) || "market";

  return (
    <ScrollView contentContainerStyle={s.content}>
      {activeDomain === "market" && <MarketDetailView model={model} />}
      {activeDomain === "vitals" && <VitalsDetailView model={model} />}
      {activeDomain === "sleep" && <SleepDetailView model={model} />}
      {activeDomain === "load" && <LoadDetailView model={model} />}
      {activeDomain === "performance" && <PerformanceDetailView model={model} />}
      {activeDomain === "combined" && <CombinedDetailView model={model} />}
    </ScrollView>
  );
}

/* ============================================================================
 * 1. ATHLETE MARKET DETAIL VIEW (INTERACTIVE CHART & INSPECTION)
 * ========================================================================== */

function MarketDetailView({ model }: { model: AnalyticsLabModel }) {
  const m = model.market;
  const series = m.equitySeries;
  const [selectedIdx, setSelectedIdx] = useState(series.length - 1);
  const selectedPoint = series[selectedIdx] ?? series[series.length - 1]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <Text style={f.sectionTitle}>Equity Curve</Text>

        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Current NAV</Text>
            <Text style={s.statVal}>{m.currentIndex.toLocaleString()} pts</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>All-Time Return</Text>
            <Text style={[s.statVal, { color: c.statusSuccess }]}>
              +{m.allTimeReturnPct}%
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Max Drawdown</Text>
            <Text style={[s.statVal, { color: c.statusError }]}>
              {m.maxDrawdownPct}%
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>4W SMA</Text>
            <Text style={s.statVal}>{series[series.length - 1]!.sma4} pts</Text>
          </View>
        </View>

        <View style={{ marginVertical: 12 }}>
          <MarketEquityChart
            model={model}
            selectedIdx={selectedIdx}
            onSelectIdx={setSelectedIdx}
          />
        </View>

        {/* Selected Data Point Readout */}
        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>{selectedPoint.label}</Text>
            <Text style={s.inspectionBadge}>
              {selectedPoint.drawdownPct === 0 ? "Peak NAV" : `${selectedPoint.drawdownPct}% Drawdown`}
            </Text>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={s.inspectionValue}>{selectedPoint.nav.toLocaleString()} pts</Text>
            <Text style={f.small}>
              {selectedPoint.volumeHours} hrs · +{selectedPoint.dividendPts} bonus pts
            </Text>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={f.small}>4W SMA: {selectedPoint.sma4} pts</Text>
            <Text style={f.small}>12W EMA: {selectedPoint.ema12} pts</Text>
          </View>
        </View>
      </View>

      <View style={f.card}>
        <Text style={f.sectionTitle}>Asset Holdings by Sport</Text>
        <View style={{ marginTop: 8, gap: 8 }}>
          {m.holdings.map((h) => (
            <View key={h.sport} style={s.holdingRow}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={s.rowName}>{h.sport}</Text>
                <Text style={f.small}>
                  {h.hours} hrs · {h.sharePct}% allocation
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text style={s.rowVal}>{h.returnPts} pts</Text>
                <Text style={f.small}>{h.yieldPerHour} pts/hr</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 2. AUTONOMIC VITALS DETAIL VIEW (INTERACTIVE CORRIDOR CHART & INSPECTION)
 * ========================================================================== */

function VitalsDetailView({ model }: { model: AnalyticsLabModel }) {
  const vitals = model.vitals.metrics;
  const [activeVitalId, setActiveVitalId] = useState<VitalId>("hrv");
  const selectedVital = vitals.find((v) => v.id === activeVitalId) ?? vitals[0]!;
  const [selectedDayIdx, setSelectedDayIdx] = useState(selectedVital.series.length - 1);

  const safeDayIdx = Math.min(selectedDayIdx, selectedVital.series.length - 1);
  const selectedDayPoint = selectedVital.series[safeDayIdx] ?? selectedVital.series[selectedVital.series.length - 1]!;
  const inCorridor =
    selectedDayPoint.value >= selectedDayPoint.baselineLow &&
    selectedDayPoint.value <= selectedDayPoint.baselineHigh;

  return (
    <View style={{ gap: 14 }}>
      {/* Vital Selector Chips */}
      <View style={f.card}>
        <Text style={f.sectionTitle}>Autonomic Baseline Corridors</Text>
        <View style={s.vitalsGrid}>
          {vitals.map((v) => {
            const isSelected = v.id === activeVitalId;
            const status = statusColors(v.status);
            return (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={`${v.name}, ${v.formattedCurrent}`}
                onPress={() => {
                  setActiveVitalId(v.id);
                  setSelectedDayIdx(v.series.length - 1);
                }}
                style={[
                  s.vitalPillCard,
                  isSelected && { borderColor: c.fieldTeal, borderWidth: 1.5 },
                ]}
              >
                <Text style={f.small}>{v.shortName}</Text>
                <Text style={s.vitalCardVal}>{v.formattedCurrent}</Text>
                <View style={[s.badge, { backgroundColor: status.bg }]}>
                  <Text style={[s.badgeText, { color: status.fg }]}>
                    {v.statusLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Active Vital Interactive Corridor Card */}
      <View style={f.card}>
        <View style={s.betweenRow}>
          <Text style={f.sectionTitle}>{selectedVital.name}</Text>
          <View
            style={[
              s.badge,
              { backgroundColor: statusColors(selectedVital.status).bg },
            ]}
          >
            <Text
              style={[
                s.badgeText,
                { color: statusColors(selectedVital.status).fg },
              ]}
            >
              {selectedVital.statusLabel}
            </Text>
          </View>
        </View>

        <View style={[s.betweenRow, { marginVertical: 8 }]}>
          <Text style={s.largeVal}>{selectedVital.formattedCurrent}</Text>
          <Text style={f.small}>
            Corridor: {selectedVital.baselineMin}–{selectedVital.baselineMax} {selectedVital.unit}
          </Text>
        </View>

        <View style={{ marginVertical: 10 }}>
          <VitalInteractiveCorridorChart
            vital={selectedVital}
            selectedIdx={safeDayIdx}
            onSelectIdx={setSelectedDayIdx}
          />
        </View>

        {/* Selected Day Inspection Readout */}
        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>{selectedDayPoint.label}</Text>
            <View
              style={[
                s.microBadge,
                {
                  backgroundColor: inCorridor
                    ? c.statusSuccessSoft
                    : c.statusWarningSoft,
                },
              ]}
            >
              <Text
                style={[
                  s.microBadgeText,
                  { color: inCorridor ? c.statusSuccess : c.statusWarning },
                ]}
              >
                {inCorridor ? "Normal" : "Out of band"}
              </Text>
            </View>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={s.inspectionValue}>
              {selectedDayPoint.value} {selectedVital.unit}
            </Text>
            <Text style={f.small}>
              Baseline: {selectedDayPoint.baselineLow}–{selectedDayPoint.baselineHigh} {selectedVital.unit}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 3. SLEEP & RECOVERY DETAIL VIEW (INTERACTIVE TIMELINE & STAGE RIBBON)
 * ========================================================================== */

function SleepDetailView({ model }: { model: AnalyticsLabModel }) {
  const sData = model.sleep;
  const nights = sData.nights;
  const [selectedNightIdx, setSelectedNightIdx] = useState(nights.length - 1);
  const selectedNight = nights[selectedNightIdx] ?? nights[nights.length - 1]!;

  const tot = Math.max(1, selectedNight.durationMin);
  const deepP = (selectedNight.deepMin / tot) * 100;
  const remP = (selectedNight.remMin / tot) * 100;
  const lightP = (selectedNight.lightMin / tot) * 100;
  const awakeP = (selectedNight.awakeMin / tot) * 100;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <Text style={f.sectionTitle}>Sleep & Recovery Architecture</Text>
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Avg Sleep Score</Text>
            <Text style={s.statVal}>{sData.avgScore} / 100</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Restorative %</Text>
            <Text style={[s.statVal, { color: c.fieldTeal }]}>
              {sData.avgRestorativePct}%
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Cumulative Debt</Text>
            <Text
              style={[
                s.statVal,
                {
                  color:
                    sData.cumulativeDebtMin > 45 ? c.statusWarning : c.statusSuccess,
                },
              ]}
            >
              {sData.cumulativeDebtMin} min
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Efficiency</Text>
            <Text style={s.statVal}>{sData.lastNight.efficiencyPct}%</Text>
          </View>
        </View>
      </View>

      {/* Interactive Sleep Nights Chart */}
      <View style={f.card}>
        <Text style={f.sectionTitle}>Daily Sleep Stages</Text>
        <View style={{ marginVertical: 12 }}>
          <SleepScoreTimelineChart
            nights={nights}
            selectedIdx={selectedNightIdx}
            onSelectIdx={setSelectedNightIdx}
          />
        </View>

        {/* Selected Night Detailed Stage Ribbon Inspection */}
        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>{selectedNight.label}</Text>
            <Text style={s.inspectionValue}>{selectedNight.score} pts</Text>
          </View>

          {/* Full Stage Ribbon for that night */}
          <View style={[s.ribbonBar, { marginVertical: 8 }]}>
            <View
              style={[
                s.ribbonSegment,
                { width: `${deepP}%`, backgroundColor: c.fieldTeal },
              ]}
            />
            <View
              style={[
                s.ribbonSegment,
                { width: `${remP}%`, backgroundColor: c.tennis },
              ]}
            />
            <View
              style={[
                s.ribbonSegment,
                { width: `${lightP}%`, backgroundColor: c.ink },
              ]}
            />
            <View
              style={[
                s.ribbonSegment,
                { width: `${awakeP}%`, backgroundColor: c.statusWarning },
              ]}
            />
          </View>

          <View style={s.betweenRow}>
            <Text style={f.small}>
              Total {formatMinutesAsHoursMins(selectedNight.durationMin)} · Deep{" "}
              {formatMinutesAsHoursMins(selectedNight.deepMin)} · REM{" "}
              {formatMinutesAsHoursMins(selectedNight.remMin)}
            </Text>
            <Text
              style={[
                f.small,
                {
                  color:
                    selectedNight.debtMin > 0 ? c.statusWarning : c.statusSuccess,
                },
              ]}
            >
              {selectedNight.debtMin > 0 ? `+${selectedNight.debtMin}m debt` : "Surplus"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 4. TRAINING LOAD DETAIL VIEW (INTERACTIVE ACWR & BURN-UP)
 * ========================================================================== */

function LoadDetailView({ model }: { model: AnalyticsLabModel }) {
  const l = model.load;
  const buckets = l.series;
  const [selectedIdx, setSelectedIdx] = useState(buckets.length - 1);
  const selectedBucket = buckets[selectedIdx] ?? buckets[buckets.length - 1]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <Text style={f.sectionTitle}>Workload Ratio (ACWR)</Text>
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Current ACWR</Text>
            <Text style={[s.statVal, { color: c.statusSuccess }]}>
              {l.acwrCurrent.toFixed(2)}x
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Acute (7D)</Text>
            <Text style={s.statVal}>{buckets[buckets.length - 1]!.acuteLoad} pts</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Chronic (28D)</Text>
            <Text style={s.statVal}>{buckets[buckets.length - 1]!.chronicLoad} pts</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Status</Text>
            <Text style={[s.statVal, { color: c.statusSuccess }]}>
              {l.acwrStatusLabel}
            </Text>
          </View>
        </View>

        <View style={{ marginVertical: 12 }}>
          <LoadAcwrInteractiveChart
            buckets={buckets}
            selectedIdx={selectedIdx}
            onSelectIdx={setSelectedIdx}
          />
        </View>

        {/* Selected Bucket Inspection */}
        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>{selectedBucket.label}</Text>
            <Text style={s.inspectionValue}>{selectedBucket.acwr.toFixed(2)}x ACWR</Text>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={f.small}>
              Acute: {selectedBucket.acuteLoad} pts · Chronic: {selectedBucket.chronicLoad} pts
            </Text>
            <Text style={f.small}>{selectedBucket.totalHours} hrs total</Text>
          </View>
          <Text style={[f.small, { marginTop: 4, color: c.muted }]}>
            Run {selectedBucket.runningHours}h · Bike {selectedBucket.cyclingHours}h · Strength {selectedBucket.strengthHours}h
          </Text>
        </View>
      </View>

      <View style={f.card}>
        <Text style={f.sectionTitle}>Period Volume Burn-Up</Text>
        <View style={{ marginVertical: 12 }}>
          <LoadBurnUpChart model={model} />
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 5. CARDIO & PACE DETAIL VIEW (INTERACTIVE EF & ZONES)
 * ========================================================================== */

function PerformanceDetailView({ model }: { model: AnalyticsLabModel }) {
  const p = model.performance;
  const runs = p.series;
  const [selectedRunIdx, setSelectedRunIdx] = useState(runs.length - 1);
  const selectedRun = runs[selectedRunIdx] ?? runs[runs.length - 1]!;

  const [selectedZone, setSelectedZone] = useState<number>(2);
  const activeZone = p.zones.find((z) => z.zone === selectedZone) ?? p.zones[1]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <Text style={f.sectionTitle}>Aerobic Efficiency (EF)</Text>
        <View style={{ marginVertical: 12 }}>
          <PerformanceEfInteractiveChart
            runs={runs}
            selectedIdx={selectedRunIdx}
            onSelectIdx={setSelectedRunIdx}
          />
        </View>

        {/* Selected Run Inspection */}
        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>{selectedRun.label}</Text>
            <Text style={s.inspectionValue}>{selectedRun.efficiencyFactor.toFixed(2)} EF</Text>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={f.small}>Pace: {selectedRun.paceMinKm.toFixed(2)} min/km</Text>
            <Text style={f.small}>Avg HR: {selectedRun.avgHr} bpm</Text>
            <Text style={f.small}>VO2 max: {selectedRun.vo2Max}</Text>
          </View>
        </View>
      </View>

      <View style={f.card}>
        <Text style={f.sectionTitle}>Heart Rate Polarization</Text>
        <View style={{ marginVertical: 12 }}>
          <PerformanceZonesInteractiveBar
            zones={p.zones}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
          />
        </View>

        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>
              Zone {activeZone.zone} · {activeZone.name}
            </Text>
            <Text style={s.inspectionValue}>{activeZone.sessionPct}% session</Text>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={f.small}>{activeZone.bpmRange}</Text>
            <Text style={f.small}>30D Target: {activeZone.monthPct}%</Text>
          </View>
        </View>
      </View>

      <View style={f.card}>
        <Text style={f.sectionTitle}>PR Staircase & Critical Pace</Text>
        <View style={{ marginTop: 8, gap: 8 }}>
          {p.prCurve.map((pr) => (
            <View key={pr.id} style={s.prRow}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={s.rowName}>{pr.distanceLabel}</Text>
                <Text style={f.small}>Prior: {pr.priorFormatted}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text style={s.rowVal}>{pr.currentFormatted}</Text>
                <Text style={[f.small, { color: c.statusSuccess }]}>
                  {pr.deltaFormatted}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * 6. MULTI-METRIC DETAIL VIEW (INTERACTIVE STRAIN VS RECOVERY)
 * ========================================================================== */

function CombinedDetailView({ model }: { model: AnalyticsLabModel }) {
  const cmb = model.combined;
  const days = cmb.series;
  const [selectedDayIdx, setSelectedDayIdx] = useState(days.length - 1);
  const selectedDay = days[selectedDayIdx] ?? days[days.length - 1]!;

  return (
    <View style={{ gap: 14 }}>
      <View style={f.card}>
        <Text style={f.sectionTitle}>Morning Readiness Brief</Text>
        <View style={{ marginVertical: 12 }}>
          <CombinedMorningBriefCard model={model} />
        </View>
      </View>

      <View style={f.card}>
        <Text style={f.sectionTitle}>Daily Training Strain vs Next-Day Recovery</Text>
        <View style={{ marginVertical: 12 }}>
          <CombinedStrainReadinessInteractiveChart
            days={days}
            selectedIdx={selectedDayIdx}
            onSelectIdx={setSelectedDayIdx}
          />
        </View>

        {/* Selected Day Inspection */}
        <View style={s.inspectionBox}>
          <View style={s.betweenRow}>
            <Text style={s.inspectionTitle}>{selectedDay.label}</Text>
            <Text style={s.inspectionValue}>{selectedDay.nextDayReadiness}% Readiness</Text>
          </View>
          <View style={[s.betweenRow, { marginTop: 4 }]}>
            <Text style={f.small}>Day Strain: {selectedDay.strainScore} / 21</Text>
            <Text style={f.small}>Next-Day HRV: {selectedDay.nextDayHrv} ms</Text>
          </View>
          <Text style={[f.small, { marginTop: 4, color: c.muted }]}>
            {selectedDay.workoutNote} ({selectedDay.sleepRestorativeHr}h restorative sleep)
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * INTERACTIVE CHARTS (TOUCH TARGETS & ACTIVE SCRUBBER GUIDES)
 * ========================================================================== */

function MarketEquityChart({
  model,
  selectedIdx,
  onSelectIdx,
}: {
  model: AnalyticsLabModel;
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const series = model.market.equitySeries;
  const allVals = series.flatMap((p) => [p.nav, p.sma4, p.ema12]);
  const minV = Math.min(...allVals) - 20;
  const maxV = Math.max(...allVals) + 20;
  const span = Math.max(1, maxV - minV);
  const W = 340;
  const H = 160;
  const L = 36;
  const R = 328;
  const T = 14;
  const B = 120;

  const toX = (i: number) => L + (i / Math.max(1, series.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const navPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`).join(" ");
  const smaPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.sma4).toFixed(1)}`).join(" ");
  const emaPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.ema12).toFixed(1)}`).join(" ");
  const areaPoints = `${L},${B} ${navPoints} ${toX(series.length - 1).toFixed(1)},${B}`;

  const activeX = toX(selectedIdx);
  const activeY = toY(series[selectedIdx]!.nav);

  return (
    <View style={{ gap: 10 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
        <Line x1={L} y1={T} x2={R} y2={T} stroke={c.line} strokeWidth={1} strokeDasharray="3,3" />

        <Path d={`M ${areaPoints} Z`} fill={c.tennis} fillOpacity={0.16} />
        <Path d={`M ${emaPoints}`} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="4,3" />
        <Path d={`M ${smaPoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2} />
        <Path d={`M ${navPoints}`} fill="none" stroke={c.ink} strokeWidth={2.5} />

        {/* Vertical Hairline Guide on Selected Point */}
        <Line
          x1={activeX}
          y1={T}
          x2={activeX}
          y2={B}
          stroke={c.ink}
          strokeWidth={1}
          strokeDasharray="3,3"
        />

        {series.map((p, i) => (
          <Circle
            key={p.id}
            cx={toX(i)}
            cy={toY(p.nav)}
            r={i === selectedIdx ? 5.5 : 2.5}
            fill={i === selectedIdx ? c.tennis : c.ink}
            stroke={c.card}
            strokeWidth={i === selectedIdx ? 2 : 1}
          />
        ))}

        {/* Transparent Touch Strips for Easy Tapping */}
        {series.map((p, i) => {
          const colW = (R - L) / series.length;
          return (
            <Rect
              key={`touch-${p.id}`}
              x={toX(i) - colW / 2}
              y={0}
              width={colW}
              height={H}
              fill="transparent"
              onPress={() => onSelectIdx(i)}
            />
          );
        })}
      </Svg>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.ink }]} />
          <Text style={f.small}>NAV</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.fieldTeal }]} />
          <Text style={f.small}>4W SMA</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.muted }]} />
          <Text style={f.small}>12W EMA</Text>
        </View>
      </View>
    </View>
  );
}

function VitalInteractiveCorridorChart({
  vital,
  selectedIdx,
  onSelectIdx,
}: {
  vital: VitalMetricModel;
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const series = vital.series;
  const vals = series.map((p) => p.value);
  const minV = Math.min(vital.baselineMin, ...vals) - (vital.id === "temp" ? 0.3 : 4);
  const maxV = Math.max(vital.baselineMax, ...vals) + (vital.id === "temp" ? 0.3 : 4);
  const span = Math.max(0.1, maxV - minV);
  const W = 340;
  const H = 100;
  const L = 36;
  const R = 328;
  const T = 10;
  const B = 85;

  const toX = (i: number) => L + (i / Math.max(1, series.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const topCorridorY = toY(vital.baselineMax);
  const botCorridorY = toY(vital.baselineMin);
  const corridorH = Math.max(2, botCorridorY - topCorridorY);

  const linePoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");
  const activeX = toX(selectedIdx);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Rect
        x={L}
        y={topCorridorY}
        width={R - L}
        height={corridorH}
        fill={c.fieldTeal}
        fillOpacity={0.12}
        rx={3}
      />
      <Line x1={L} y1={topCorridorY} x2={R} y2={topCorridorY} stroke={c.fieldTeal} strokeWidth={1} strokeDasharray="3,3" />
      <Line x1={L} y1={botCorridorY} x2={R} y2={botCorridorY} stroke={c.fieldTeal} strokeWidth={1} strokeDasharray="3,3" />

      {/* Vertical Hairline */}
      <Line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

      <Path d={`M ${linePoints}`} fill="none" stroke={c.ink} strokeWidth={2} />

      {series.map((p, i) => (
        <Circle
          key={p.day}
          cx={toX(i)}
          cy={toY(p.value)}
          r={i === selectedIdx ? 5.5 : 2.5}
          fill={i === selectedIdx ? c.fieldTeal : c.ink}
          stroke={c.card}
          strokeWidth={i === selectedIdx ? 2 : 1}
        />
      ))}

      {/* Transparent Touch Strips */}
      {series.map((p, i) => {
        const colW = (R - L) / series.length;
        return (
          <Rect
            key={`touch-${p.day}`}
            x={toX(i) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            onPress={() => onSelectIdx(i)}
          />
        );
      })}
    </Svg>
  );
}

function SleepScoreTimelineChart({
  nights,
  selectedIdx,
  onSelectIdx,
}: {
  nights: AnalyticsLabModel["sleep"]["nights"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const scores = nights.map((n) => n.score);
  const minV = Math.min(...scores) - 5;
  const maxV = 100;
  const span = Math.max(1, maxV - minV);
  const W = 340;
  const H = 120;
  const L = 36;
  const R = 328;
  const T = 12;
  const B = 100;

  const toX = (i: number) => L + (i / Math.max(1, nights.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const linePoints = nights.map((n, i) => `${toX(i).toFixed(1)},${toY(n.score).toFixed(1)}`).join(" ");
  const activeX = toX(selectedIdx);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
      <Line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

      <Path d={`M ${linePoints}`} fill="none" stroke={c.ink} strokeWidth={2} />

      {nights.map((n, i) => (
        <Circle
          key={n.id}
          cx={toX(i)}
          cy={toY(n.score)}
          r={i === selectedIdx ? 5.5 : 3}
          fill={i === selectedIdx ? c.tennis : c.ink}
          stroke={c.card}
          strokeWidth={i === selectedIdx ? 2 : 1}
        />
      ))}

      {nights.map((n, i) => {
        const colW = (R - L) / nights.length;
        return (
          <Rect
            key={`touch-${n.id}`}
            x={toX(i) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            onPress={() => onSelectIdx(i)}
          />
        );
      })}
    </Svg>
  );
}

function LoadAcwrInteractiveChart({
  buckets,
  selectedIdx,
  onSelectIdx,
}: {
  buckets: AnalyticsLabModel["load"]["series"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const W = 340;
  const H = 130;
  const L = 36;
  const R = 328;
  const T = 12;
  const B = 105;

  const minV = 0.5;
  const maxV = 2.0;
  const span = maxV - minV;

  const toX = (i: number) => L + (i / Math.max(1, buckets.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const sweetTop = toY(1.3);
  const sweetBot = toY(0.8);
  const sweetH = Math.max(2, sweetBot - sweetTop);

  const acwrPoints = buckets.map((b, i) => `${toX(i).toFixed(1)},${toY(b.acwr).toFixed(1)}`).join(" ");
  const activeX = toX(selectedIdx);

  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect
          x={L}
          y={sweetTop}
          width={R - L}
          height={sweetH}
          fill={c.statusSuccess}
          fillOpacity={0.12}
          rx={4}
        />
        <Line x1={L} y1={toY(1.5)} x2={R} y2={toY(1.5)} stroke={c.statusWarning} strokeWidth={1} strokeDasharray="3,3" />
        <Line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

        <Path d={`M ${acwrPoints}`} fill="none" stroke={c.ink} strokeWidth={2.5} />

        {buckets.map((b, i) => (
          <Circle
            key={b.id}
            cx={toX(i)}
            cy={toY(b.acwr)}
            r={i === selectedIdx ? 6 : 3.5}
            fill={b.acwr > 1.4 ? c.statusWarning : c.statusSuccess}
            stroke={c.card}
            strokeWidth={1.5}
          />
        ))}

        {buckets.map((b, i) => {
          const colW = (R - L) / buckets.length;
          return (
            <Rect
              key={`touch-${b.id}`}
              x={toX(i) - colW / 2}
              y={0}
              width={colW}
              height={H}
              fill="transparent"
              onPress={() => onSelectIdx(i)}
            />
          );
        })}
      </Svg>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.statusSuccess }]} />
          <Text style={f.small}>Sweet Spot (0.8–1.3x)</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.statusWarning }]} />
          <Text style={f.small}>Danger Zone (&gt;1.5x)</Text>
        </View>
      </View>
    </View>
  );
}

function LoadBurnUpChart({ model }: { model: AnalyticsLabModel }) {
  const buckets = model.load.series;
  const maxH = Math.max(...buckets.map((b) => Math.max(b.cumCurrentHours, b.cumGhostHours, b.cumTargetHours))) + 2;
  const W = 340;
  const H = 120;
  const L = 36;
  const R = 328;
  const T = 12;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, buckets.length - 1)) * (R - L);
  const toY = (v: number) => B - (v / maxH) * (B - T);

  const curPoints = buckets.map((b, i) => `${toX(i).toFixed(1)},${toY(b.cumCurrentHours).toFixed(1)}`).join(" ");
  const ghostPoints = buckets.map((b, i) => `${toX(i).toFixed(1)},${toY(b.cumGhostHours).toFixed(1)}`).join(" ");

  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
        <Path d={`M ${ghostPoints}`} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="3,3" />
        <Path d={`M ${curPoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2.5} />

        {buckets.map((b, i) => (
          <Circle
            key={b.id}
            cx={toX(i)}
            cy={toY(b.cumCurrentHours)}
            r={i === buckets.length - 1 ? 4 : 2.5}
            fill={c.fieldTeal}
            stroke={c.card}
            strokeWidth={1.5}
          />
        ))}
      </Svg>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.fieldTeal }]} />
          <Text style={f.small}>Current Week ({buckets[buckets.length - 1]!.cumCurrentHours}h)</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.muted }]} />
          <Text style={f.small}>Ghost Prior Week ({buckets[buckets.length - 1]!.cumGhostHours}h)</Text>
        </View>
      </View>
    </View>
  );
}

function PerformanceEfInteractiveChart({
  runs,
  selectedIdx,
  onSelectIdx,
}: {
  runs: AnalyticsLabModel["performance"]["series"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const efs = runs.map((p) => p.efficiencyFactor);
  const minV = Math.min(...efs) - 0.05;
  const maxV = Math.max(...efs) + 0.05;
  const span = Math.max(0.01, maxV - minV);
  const W = 340;
  const H = 120;
  const L = 36;
  const R = 328;
  const T = 10;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, runs.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const linePoints = runs.map((p, i) => `${toX(i).toFixed(1)},${toY(p.efficiencyFactor).toFixed(1)}`).join(" ");
  const activeX = toX(selectedIdx);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
      <Line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

      <Path d={`M ${linePoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2.5} />
      {runs.map((p, i) => (
        <Circle
          key={p.id}
          cx={toX(i)}
          cy={toY(p.efficiencyFactor)}
          r={i === selectedIdx ? 5.5 : 3}
          fill={c.fieldTeal}
          stroke={c.card}
          strokeWidth={i === selectedIdx ? 2 : 1}
        />
      ))}

      {runs.map((p, i) => {
        const colW = (R - L) / runs.length;
        return (
          <Rect
            key={`touch-${p.id}`}
            x={toX(i) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            onPress={() => onSelectIdx(i)}
          />
        );
      })}
    </Svg>
  );
}

function PerformanceZonesInteractiveBar({
  zones,
  selectedZone,
  onSelectZone,
}: {
  zones: AnalyticsLabModel["performance"]["zones"];
  selectedZone: number;
  onSelectZone: (zone: number) => void;
}) {
  const zoneColors = [c.soft, c.fieldTeal, c.tennis, c.statusWarning, c.statusError];

  return (
    <View style={{ gap: 8 }}>
      <View style={s.zoneBar}>
        {zones.map((z, i) => (
          <Pressable
            key={z.zone}
            accessibilityRole="button"
            accessibilityLabel={`Zone ${z.zone}, ${z.name}`}
            onPress={() => onSelectZone(z.zone)}
            style={[
              s.zoneSegment,
              {
                width: `${z.sessionPct}%`,
                backgroundColor: zoneColors[i],
                opacity: selectedZone === z.zone ? 1 : 0.65,
                borderWidth: selectedZone === z.zone ? 1.5 : 0,
                borderColor: c.ink,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function CombinedStrainReadinessInteractiveChart({
  days,
  selectedIdx,
  onSelectIdx,
}: {
  days: AnalyticsLabModel["combined"]["series"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const W = 340;
  const H = 120;
  const L = 30;
  const R = 328;
  const T = 12;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, days.length - 1)) * (R - L);
  const toYReadiness = (v: number) => B - (v / 100) * (B - T);
  const toYStrain = (v: number) => B - (v / 21) * (B - T);

  const readPoints = days.map((p, i) => `${toX(i).toFixed(1)},${toYReadiness(p.nextDayReadiness).toFixed(1)}`).join(" ");
  const activeX = toX(selectedIdx);

  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Vertical Hairline */}
        <Line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

        {days.map((p, i) => {
          const x = toX(i);
          const barH = B - toYStrain(p.strainScore);
          return (
            <Rect
              key={p.id}
              x={x - 4}
              y={B - barH}
              width={8}
              height={barH}
              fill={i === selectedIdx ? c.tennis : c.soft}
              rx={2}
            />
          );
        })}
        <Path d={`M ${readPoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2} />

        {days.map((p, i) => (
          <Circle
            key={`dot-${p.id}`}
            cx={toX(i)}
            cy={toYReadiness(p.nextDayReadiness)}
            r={i === selectedIdx ? 5 : 2.5}
            fill={c.fieldTeal}
            stroke={c.card}
            strokeWidth={1.5}
          />
        ))}

        {days.map((p, i) => {
          const colW = (R - L) / days.length;
          return (
            <Rect
              key={`touch-${p.id}`}
              x={toX(i) - colW / 2}
              y={0}
              width={colW}
              height={H}
              fill="transparent"
              onPress={() => onSelectIdx(i)}
            />
          );
        })}
      </Svg>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.soft }]} />
          <Text style={f.small}>Day Strain</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: c.fieldTeal }]} />
          <Text style={f.small}>Next-Day Readiness</Text>
        </View>
      </View>
    </View>
  );
}

function CombinedMorningBriefCard({ model }: { model: AnalyticsLabModel }) {
  const v = model.vitals;
  const sData = model.sleep;
  const cData = model.combined;

  return (
    <View style={{ gap: 10 }}>
      <View style={s.statsGrid}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Composite Readiness</Text>
          <Text style={[s.statVal, { color: c.statusSuccess }]}>
            {v.readinessComposite}%
          </Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Strain Ceiling</Text>
          <Text style={s.statVal}>{cData.optimalStrainCeiling} / 21</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Last Night Sleep</Text>
          <Text style={s.statVal}>{sData.lastNight.score} score</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Target Bedtime</Text>
          <Text style={s.statVal}>10:30 PM</Text>
        </View>
      </View>
    </View>
  );
}

function statusColors(status: "optimal" | "normal" | "caution") {
  if (status === "optimal") {
    return { bg: c.statusSuccessSoft, fg: c.statusSuccess };
  }
  if (status === "caution") {
    return { bg: c.statusWarningSoft, fg: c.statusWarning };
  }
  return { bg: c.soft, fg: c.ink };
}

const s = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  statBox: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: c.soft,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: c.muted,
  },
  statVal: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  largeVal: {
    fontSize: 22,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  vitalPillCard: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: c.soft,
    borderRadius: 8,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  vitalCardVal: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  inspectionBox: {
    backgroundColor: c.soft,
    borderRadius: 8,
    padding: 12,
    gap: 4,
    marginTop: 8,
  },
  inspectionTitle: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  inspectionValue: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  inspectionBadge: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: c.statusSuccess,
  },
  holdingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  rowName: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  rowVal: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
  },
  microBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  microBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
  },
  betweenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ribbonBar: {
    flexDirection: "row",
    height: 18,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: c.soft,
  },
  ribbonSegment: {
    height: "100%",
  },
  zoneBar: {
    flexDirection: "row",
    height: 20,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: c.soft,
  },
  zoneSegment: {
    height: "100%",
  },
});
