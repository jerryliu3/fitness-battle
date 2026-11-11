import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { FocusSegments } from "../ui/focus";
import { AppText } from "../ui/section";
import { StandardLineChart } from "../ui/standard-line-chart";
import { ChartSvg } from "../ui/chart-text";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Circle, Path } from "react-native-svg";
import {
  competeNow,
  formatHealthNumber,
  formatSleepDuration,
  healthSparkline,
  recordedHealthSeries,
  type AnalyticsTimeLens,
  type CompeteState,
} from "@fitness-battle/shared";

type HealthMetricKey = "hrv" | "rhr" | "sleep";

const TIME_LENSES: readonly { value: AnalyticsTimeLens; label: string; days: number }[] = [
  { value: "7d", label: "7D", days: 7 },
  { value: "30d", label: "30D", days: 30 },
  { value: "90d", label: "90D", days: 90 },
];

function MiniSparkline({ history, stroke }: { history: (number | null)[]; stroke: string }) {
  const spark = healthSparkline(history);
  if (!spark.dots.length) return null;
  return (
    <ChartSvg width="100%" height={36} viewBox="0 0 80 32">
      {spark.segments.map((segment) => (
        <Path
          key={segment}
          d={`M ${segment}`}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {spark.dots.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={1.5} fill={stroke} />
      ))}
    </ChartSvg>
  );
}

export function HealthLabSpace({
  state,
  signedOut = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const [selectedMetric, setSelectedMetric] = useState<HealthMetricKey>("hrv");
  const [selectedIdx, setSelectedIdx] = useState<number | undefined>(undefined);

  const now = useMemo(() => (state ? competeNow(state) : new Date()), [state]);
  const days = TIME_LENSES.find((lens) => lens.value === timeLens)?.days ?? 30;

  const series = useMemo(() => {
    if (!state || signedOut) {
      return { hrv: [], rhr: [], sleep: [] };
    }
    return {
      hrv: recordedHealthSeries(state, "hrv", days, now),
      rhr: recordedHealthSeries(state, "resting-hr", days, now),
      sleep: recordedHealthSeries(state, "sleep", days, now),
    };
  }, [state, signedOut, days, now]);

  const activeRows = selectedMetric === "hrv" ? series.hrv : selectedMetric === "rhr" ? series.rhr : series.sleep;
  const lastRecorded = [...activeRows].reverse().find((row) => row.value != null);
  const selected = selectedIdx != null ? activeRows[selectedIdx] : undefined;
  const inspected = selected?.value != null ? selected : lastRecorded;
  const formatReading = (metric: HealthMetricKey, value: number) =>
    metric === "sleep" ? formatSleepDuration(value) : metric === "hrv" ? `${formatHealthNumber(value)} ms` : `${formatHealthNumber(value)} bpm`;
  const latest = (metric: HealthMetricKey) => {
    const rows = metric === "hrv" ? series.hrv : metric === "rhr" ? series.rhr : series.sleep;
    const last = [...rows].reverse().find((row) => row.value != null);
    return last?.value != null ? { value: formatReading(metric, last.value), label: last.label } : null;
  };

  const titles: Record<HealthMetricKey, string> = {
    hrv: "Overnight HRV",
    rhr: "Resting Heart Rate",
    sleep: "Sleep duration",
  };
  const healthInsight = !latest("hrv") && !latest("rhr") && !latest("sleep")
    ? "Connect a supported tracker to record HRV, resting heart rate, and sleep. Charts stay empty until observations exist."
    : [
        latest("hrv") ? `Latest HRV ${latest("hrv")!.value} on ${latest("hrv")!.label}` : null,
        latest("sleep") ? `Latest sleep ${latest("sleep")!.value} on ${latest("sleep")!.label}` : null,
        latest("rhr") ? `Latest resting HR ${latest("rhr")!.value} on ${latest("rhr")!.label}` : null,
      ].filter(Boolean).join(". ") + ".";

  const card = (metric: HealthMetricKey, label: string) => {
    const reading = latest(metric);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${reading ? reading.value : "no data"}`}
        onPress={() => { setSelectedMetric(metric); setSelectedIdx(undefined); }}
        style={[s.summaryCard, selectedMetric === metric && s.summaryCardActive]}
      >
        <AppText role="caption" secondary numberOfLines={1}>{label}</AppText>
        <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
          {reading?.value ?? "—"}
        </AppText>
        <AppText role="caption" secondary numberOfLines={1}>
          {reading ? reading.label : "No data"}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.summaryCardsRow}>
        {card("hrv", "Overnight HRV")}
        {card("sleep", "Sleep")}
        {card("rhr", "Resting HR")}
      </View>

      <View style={s.chartCard}>
        <View style={{ gap: 2 }}>
          <AppText role="caption" secondary>{titles[selectedMetric]}</AppText>
          <View style={s.valueRow}>
            <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
              {inspected?.value != null ? formatReading(selectedMetric, inspected.value) : "—"}
            </AppText>
          </View>
          <AppText role="caption" secondary>
            {inspected?.label ?? "No recorded observations"}
          </AppText>
        </View>
        <FocusSegments
          label="Health time lens"
          value={timeLens}
          options={TIME_LENSES}
          onChange={(next) => { setTimeLens(next); setSelectedIdx(undefined); }}
        />
        <View style={s.chartBody}>
          {lastRecorded ? (
            <StandardLineChart
              height={180}
              showAxes={true}
              showSummary={false}
              xAxisLabel="Date"
              values={activeRows.map((row) => row.value)}
              pointLabels={activeRows.map((row) => row.label)}
              selectedIdx={selectedIdx}
              onSelectIdx={setSelectedIdx}
              stroke={c.tennis}
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

      <View style={{ gap: 12 }}>
        <AppText role="heading">Advanced Analytics</AppText>
        <View style={s.bentoGrid}>
          {([
            { id: "hrv", kicker: "Overnight HRV", reading: latest("hrv"), history: series.hrv.map((row) => row.value) },
            { id: "sleep", kicker: "Sleep", reading: latest("sleep"), history: series.sleep.map((row) => row.value) },
            { id: "load", kicker: "Workload Ratio", reading: null, history: [] as (number | null)[] },
            { id: "performance", kicker: "Aerobic Efficiency", reading: null, history: [] as (number | null)[] },
          ]).map((tile) => (
            <View key={tile.id} style={s.bentoTile} accessibilityLabel={`${tile.kicker}, ${tile.reading ? tile.reading.value : "no data"}`}>
              <AppText role="caption" secondary numberOfLines={1}>{tile.kicker}</AppText>
              <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                {tile.reading?.value ?? "—"}
              </AppText>
              <MiniSparkline history={tile.history} stroke={c.tennis} />
              <AppText role="caption" secondary numberOfLines={1}>
                {tile.reading ? tile.reading.label : "No data"}
              </AppText>
            </View>
          ))}
        </View>
      </View>

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
}

const sThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
    container: { gap: 20 },
    summaryCardsRow: { flexDirection: "row", gap: 8 },
    summaryCard: {
      flex: 1,
      padding: 12,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 4,
    },
    summaryCardActive: { borderColor: c.tennis, borderWidth: 1.5 },
    chartCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 14,
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
      backgroundColor: c.soft,
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
      backgroundColor: `${c.tennis}22`,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    bentoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    bentoTile: {
      width: "48.2%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.soft,
      padding: 12,
      gap: 6,
    },
  };
});
