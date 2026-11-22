import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { FocusSegments } from "../ui/focus";
import { AppText } from "../ui/section";
import { StandardLineChart } from "../ui/standard-line-chart";
import { CompeteSheet } from "../ui/compete-sheet";
import { useMemo, useState } from "react";
import { View } from "react-native";
import {
  MEDAL_GOLD,
  competeNow,
  formatHealthNumber,
  formatSleepDuration,
  getHealthMetricCorridor,
  recordedHealthSeries,
  type AnalyticsTimeLens,
  type CompeteState,
} from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { AthleteTelemetryMatrix } from "./athlete-telemetry-matrix";
import { VitalsLabBodyScan } from "./vitals-lab-body-scan";

type HealthMetricKey = "hrv" | "rhr" | "sleep";

const TIME_LENSES: readonly { value: AnalyticsTimeLens; label: string; days: number }[] = [
  { value: "7d", label: "1W", days: 7 },
  { value: "30d", label: "1M", days: 30 },
  { value: "90d", label: "3M", days: 90 },
];

export function HealthLabSpace({
  state,
  signedOut = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const { user } = useAuth();

  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("7d");
  const [selectedMetric, setSelectedMetric] = useState<HealthMetricKey>("hrv");
  const [selectedIdx, setSelectedIdx] = useState<number | undefined>(undefined);

  const now = useMemo(() => (state ? competeNow(state) : new Date()), [state]);
  const days = TIME_LENSES.find((lens) => lens.value === timeLens)?.days ?? 30;

  const series = useMemo(() => {
    if (!state || signedOut) {
      return { hrv: [], rhr: [], sleep: [] };
    }
    return {
      hrv: recordedHealthSeries(state, "hrv", days, now, user?.createdAt),
      rhr: recordedHealthSeries(state, "resting-hr", days, now, user?.createdAt),
      sleep: recordedHealthSeries(state, "sleep", days, now, user?.createdAt),
    };
  }, [state, signedOut, days, now, user?.createdAt]);

  const activeRows = selectedMetric === "hrv" ? series.hrv : selectedMetric === "rhr" ? series.rhr : series.sleep;
  const lastRecorded = [...activeRows].reverse().find((row) => row.value != null);
  const selected = selectedIdx != null ? activeRows[selectedIdx] : undefined;
  const inspected = selected?.value != null ? selected : lastRecorded;
  const formatReading = (metric: HealthMetricKey, value: number) =>
    metric === "sleep" ? formatSleepDuration(value) : metric === "hrv" ? `${formatHealthNumber(value)} ms` : `${formatHealthNumber(value)} bpm`;
  const corridorSeries = useMemo(() => {
    const values = activeRows.map((row) => row.value);
    const metricId = selectedMetric === "rhr" ? "resting-hr" : selectedMetric;
    const personal = getHealthMetricCorridor(metricId, values);
    if (!personal) return undefined;
    return {
      high: values.map(() => personal.high),
      low: values.map(() => personal.low),
    };
  }, [activeRows, selectedMetric]);
  const titles: Record<HealthMetricKey, string> = {
    hrv: "Overnight HRV",
    rhr: "Resting Heart Rate",
    sleep: "Sleep duration",
  };
  const healthInsight = !lastRecorded || lastRecorded.value == null
    ? "Connect a supported tracker to record HRV, resting heart rate, and sleep. Charts stay empty until observations exist."
    : `Latest ${titles[selectedMetric].toLowerCase()} ${formatReading(selectedMetric, lastRecorded.value)} on ${lastRecorded.label}.`;

  const sheetContent = (
    <View style={s.sheetStack}>
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View style={{ flex: 1, gap: 2, minWidth: 115 }}>
            <AppText role="caption" secondary>{titles[selectedMetric]}</AppText>
            <View style={s.valueRow}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {inspected?.value != null ? formatReading(selectedMetric, inspected.value) : "—"}
              </AppText>
            </View>
            {!inspected && (
              <AppText role="caption" secondary>
                No recorded observations
              </AppText>
            )}
          </View>
          <View style={s.compactRangeWrap}>
            <FocusSegments
              compact
              label="Health time lens"
              value={timeLens}
              options={TIME_LENSES}
              onChange={(next) => { setTimeLens(next); setSelectedIdx(undefined); }}
            />
          </View>
        </View>
        <View style={s.chartBody}>
          {lastRecorded ? (
            <StandardLineChart
              height={180}
              showAxes={true}
              showSummary={false}
              values={activeRows.map((row) => row.value)}
              pointLabels={activeRows.map((row) => row.label)}
              selectedIdx={selectedIdx}
              onSelectIdx={setSelectedIdx}
              stroke={c.tennis}
              corridor={corridorSeries}
              formatAxisY={formatHealthNumber}
              formatY={(v) => formatReading(selectedMetric, v)}
              accessibilityLabel={`${titles[selectedMetric]} recorded history`}
            />
          ) : (
            <AppText role="body" secondary>
              No recorded {titles[selectedMetric].toLowerCase()} in this range.
            </AppText>
          )}
        </View>
      </View>

      {state && !signedOut ? <AthleteTelemetryMatrix state={state} signedOut={false} /> : null}

      <View style={s.insightCard}>
        <View style={s.insightIcon}>
          <AppText role="value" style={{ color: c.tennis }}>✦</AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText role="label">Health Insight</AppText>
          <AppText role="body" secondary>
            {healthInsight}
          </AppText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <VitalsLabBodyScan
        immersive
        state={state}
        signedOut={signedOut}
        onChartMetricChange={(metric) => {
          setSelectedMetric(metric);
          setSelectedIdx(undefined);
        }}
      />
      <CompeteSheet active expandRequest={0} defaultIndex={0} scrollable>
        {sheetContent}
      </CompeteSheet>
    </View>
  );
}

const sThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
    root: { flex: 1 },
    sheetStack: { gap: 20 },
    chartCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      gap: 14,
    },
    chartHeaderRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    compactRangeWrap: {
      alignSelf: "flex-start",
      flexShrink: 0,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginVertical: 4,
    },
    chartBody: { marginTop: 8, minHeight: 80 },
    insightCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    insightIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${MEDAL_GOLD.srgb}22`,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
  };
});