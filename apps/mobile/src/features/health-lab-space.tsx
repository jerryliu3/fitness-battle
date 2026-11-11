import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useFocusStyles, FocusSegments } from "../ui/focus";
import { AppText } from "../ui/section";
import { StandardLineChart } from "../ui/standard-line-chart";
import { ChartSvg } from "../ui/chart-text";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";
import {
  buildAnalyticsLabModel,
  buildSvgLineGeometry,
  type AnalyticsDomainId,
  type AnalyticsTimeLens,
  type CompeteState,
  type VitalMetricModel,
} from "@fitness-battle/shared";

type HealthMetricKey = "hrv" | "rhr" | "sleep";

const TIME_LENSES: readonly { value: AnalyticsTimeLens; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];

function MiniSparkline({
  values,
  stroke,
  corridor,
}: {
  values: number[];
  stroke: string;
  corridor?: { high: number[]; low: number[] };
}) {
  if (values.length < 2) return null;
  const all = corridor ? [...values, ...corridor.high, ...corridor.low] : values;
  const low = Math.min(...all), high = Math.max(...all);
  const geometry = buildSvgLineGeometry(values, 78, 28, 2, { min: low, max: high });
  const polyline = geometry.polyline;
  const points = geometry.points.map((point, i) => ({ ...point, val: values[i]! }));
  return (
    <ChartSvg width="100%" height={36} viewBox="0 0 82 32">
      <G transform="translate(2 2)">
        {corridor && (
          <Path
            d={`M ${corridor.high.map((v, i) => `${2 + (i / (values.length - 1)) * 74},${26 - ((v - low) / (high - low || 1)) * 24}`).join(" L ")} L ${corridor.low.map((v, i) => `${2 + (i / (values.length - 1)) * 74},${26 - ((v - low) / (high - low || 1)) * 24}`).reverse().join(" L ")} Z`}
            fill={stroke}
            opacity={0.16}
          />
        )}
        <Path
          d={`M ${polyline}`}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={1.5} fill={stroke} />
        ))}
      </G>
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
  const f = useFocusStyles();
  const s = useThemedStyles(sThemes);
  const router = useRouter();

  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const [selectedMetric, setSelectedMetric] = useState<HealthMetricKey>("hrv");

  const model = useMemo(
    () => buildAnalyticsLabModel(state, timeLens),
    [state, timeLens],
  );

  const hrvMetric = model.vitals.metrics.find((m) => m.id === "hrv") ?? model.vitals.metrics[0];
  const rhrMetric = model.vitals.metrics.find((m) => m.id === "rhr") ?? model.vitals.metrics[1];
  const sleepModel = model.sleep;

  // Active chart series based on selected metric
  const activeChart = useMemo(() => {
    if (selectedMetric === "hrv" && hrvMetric) {
      const values = hrvMetric.series.map((p) => p.value);
      const high = hrvMetric.series.map((p) => p.baselineHigh);
      const low = hrvMetric.series.map((p) => p.baselineLow);
      const pointLabels = hrvMetric.series.map((p) => p.label ?? p.day?.slice(5) ?? "");
      return {
        title: "Overnight HRV",
        unit: hrvMetric.unit,
        current: hrvMetric.formattedCurrent,
        statusLabel: hrvMetric.statusLabel,
        corridorLabel: `Baseline corridor (${Math.round(hrvMetric.baselineMin)}–${Math.round(hrvMetric.baselineMax)} ${hrvMetric.unit})`,
        values,
        pointLabels,
        corridor: { high, low },
        domain: "vitals" as const,
      };
    }

    if (selectedMetric === "rhr" && rhrMetric) {
      const values = rhrMetric.series.map((p) => p.value);
      const high = rhrMetric.series.map((p) => p.baselineHigh);
      const low = rhrMetric.series.map((p) => p.baselineLow);
      const pointLabels = rhrMetric.series.map((p) => p.label ?? p.day?.slice(5) ?? "");
      return {
        title: "Resting Heart Rate",
        unit: rhrMetric.unit,
        current: rhrMetric.formattedCurrent,
        statusLabel: rhrMetric.statusLabel,
        corridorLabel: `Baseline corridor (${Math.round(rhrMetric.baselineMin)}–${Math.round(rhrMetric.baselineMax)} ${rhrMetric.unit})`,
        values,
        pointLabels,
        corridor: { high, low },
        domain: "vitals" as const,
      };
    }

    // Sleep score series
    const values = sleepModel.nights.map((n) => n.score);
    const high = sleepModel.nights.map(() => 90);
    const low = sleepModel.nights.map(() => 75);
    const pointLabels = sleepModel.nights.map((n) => n.label);
    return {
      title: "Sleep Quality",
      unit: "score",
      current: `${sleepModel.lastNight.score} score`,
      statusLabel: `${sleepModel.lastNight.restorativePct}% restorative`,
      corridorLabel: "Target baseline (75–90 score)",
      values,
      pointLabels,
      corridor: { high, low },
      domain: "sleep" as const,
    };
  }, [selectedMetric, hrvMetric, rhrMetric, sleepModel]);

  // Contextual health insight
  const healthInsight = useMemo(() => {
    if (signedOut) {
      return "Connect a supported tracker or health wearable to monitor your autonomic nervous system and daily recovery trends.";
    }
    const hrvStatus = hrvMetric?.status ?? "normal";
    if (hrvStatus === "optimal") {
      return `HRV is ${hrvMetric?.deltaLabel ?? "above baseline corridor"} and sleep quality is stable, indicating strong parasympathetic recovery and high training capacity.`;
    }
    if (hrvStatus === "caution") {
      return `HRV is suppressed relative to baseline. Consider active recovery or lower-intensity aerobic work today to support physiological restoration.`;
    }
    return `Autonomic nervous system is balanced within your personal 60-day corridor, supporting steady training continuity.`;
  }, [signedOut, hrvMetric]);

  // Key signals for baseline comparison breakdown
  const baselineSignals = [
    {
      id: "hrv",
      name: "Overnight HRV",
      current: signedOut ? "—" : (hrvMetric?.formattedCurrent ?? "64 ms"),
      normal: `${Math.round(hrvMetric?.baselineMin ?? 50)}–${Math.round(hrvMetric?.baselineMax ?? 75)} ms`,
      ratio: hrvMetric ? Math.min(1, Math.max(0, (hrvMetric.current - (hrvMetric.baselineMin * 0.8)) / (hrvMetric.baselineMax * 1.2 - hrvMetric.baselineMin * 0.8))) : 0.6,
      status: hrvMetric?.statusLabel ?? "Normal",
      domain: "vitals" as const,
    },
    {
      id: "sleep",
      name: "Sleep & Debt",
      current: signedOut ? "—" : `${sleepModel.lastNight.score} score`,
      normal: "75–90 score",
      ratio: Math.min(1, Math.max(0, sleepModel.lastNight.score / 100)),
      status: `${sleepModel.lastNight.debtMin}m debt`,
      domain: "sleep" as const,
    },
    {
      id: "rhr",
      name: "Resting HR",
      current: signedOut ? "—" : (rhrMetric?.formattedCurrent ?? "52 bpm"),
      normal: `${Math.round(rhrMetric?.baselineMin ?? 48)}–${Math.round(rhrMetric?.baselineMax ?? 58)} bpm`,
      ratio: rhrMetric ? Math.min(1, Math.max(0, (rhrMetric.current - 40) / 40)) : 0.4,
      status: rhrMetric?.statusLabel ?? "Normal",
      domain: "vitals" as const,
    },
  ];

  // Advanced Analytics Bento Tiles (Exact 2x2 grid matching origin/main)
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
    {
      id: "vitals",
      domain: "vitals" as const,
      kicker: "Overnight HRV",
      value: signedOut ? "—" : (model.vitals.metrics[0]?.formattedCurrent ?? "64 ms"),
      delta: signedOut
        ? "No data"
        : `${model.vitals.metrics[0]?.statusLabel ?? "Normal"} corridor`,
      points: signedOut ? [] : (model.vitals.metrics[0]?.series.map((p) => p.value) ?? []),
      accent: c.tennis,
      corridor: !signedOut && model.vitals.metrics[0]
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
      value: signedOut ? "—" : `${model.sleep.lastNight.score} score`,
      delta: signedOut
        ? "No data"
        : `${model.sleep.lastNight.restorativePct}% restorative · ${model.sleep.lastNight.debtMin}m debt`,
      points: signedOut ? [] : model.sleep.nights.map((n) => n.score),
      accent: c.tennis,
    },
    {
      id: "load",
      domain: "load" as const,
      kicker: "Workload Ratio",
      value: signedOut ? "—" : `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: signedOut ? "No data" : model.load.acwrStatusLabel,
      points: signedOut ? [] : model.load.series.map((b) => b.acwr * 100),
      accent: c.tennis,
    },
    {
      id: "performance",
      domain: "performance" as const,
      kicker: "Aerobic Efficiency",
      value: signedOut ? "—" : model.performance.efCurrent.toFixed(2),
      delta: signedOut
        ? "No data"
        : `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: signedOut ? [] : model.performance.series.map((p) => p.efficiencyFactor),
      accent: c.tennis,
    },
  ];

  return (
    <View style={s.container}>
      {/* Contextual Readiness pill (supporting synthesis, not headline) */}
      {!signedOut && (
        <View style={s.readinessSupportBar}>
          <View style={s.readinessBadge}>
            <AppText role="caption" style={{ color: c.card, fontWeight: "700" }}>
              {model.vitals.readinessComposite}% Readiness
            </AppText>
          </View>
          <AppText role="caption" secondary numberOfLines={1} style={{ flex: 1 }}>
            {model.vitals.autonomicStateLabel} · Strain ceiling {model.combined.optimalStrainCeiling}
          </AppText>
        </View>
      )}

      {/* Top Recorded Measurements Summary Cards */}
      <View style={s.summaryCardsRow}>
        {/* Overnight HRV */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Overnight HRV: ${signedOut ? "no data" : (hrvMetric?.formattedCurrent ?? "64 ms")}`}
          onPress={() => setSelectedMetric("hrv")}
          style={[s.summaryCard, selectedMetric === "hrv" && s.summaryCardActive]}
        >
          <AppText role="caption" secondary numberOfLines={1}>Overnight HRV</AppText>
          <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
            {signedOut ? "—" : (hrvMetric?.formattedCurrent ?? "64 ms")}
          </AppText>
          <AppText role="caption" style={{ color: c.tennis }} numberOfLines={1}>
            {signedOut ? "No data" : (hrvMetric?.statusLabel ?? "Normal")}
          </AppText>
        </Pressable>

        {/* Sleep & Debt */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sleep & Debt: ${signedOut ? "no data" : `${sleepModel.lastNight.score} score`}`}
          onPress={() => setSelectedMetric("sleep")}
          style={[s.summaryCard, selectedMetric === "sleep" && s.summaryCardActive]}
        >
          <AppText role="caption" secondary numberOfLines={1}>Sleep & Debt</AppText>
          <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
            {signedOut ? "—" : `${sleepModel.lastNight.debtMin}m debt`}
          </AppText>
          <AppText role="caption" secondary numberOfLines={1}>
            {signedOut ? "No data" : `${sleepModel.lastNight.restorativePct}% restorative`}
          </AppText>
        </Pressable>

        {/* Resting Heart Rate */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Resting Heart Rate: ${signedOut ? "no data" : (rhrMetric?.formattedCurrent ?? "52 bpm")}`}
          onPress={() => setSelectedMetric("rhr")}
          style={[s.summaryCard, selectedMetric === "rhr" && s.summaryCardActive]}
        >
          <AppText role="caption" secondary numberOfLines={1}>Resting HR</AppText>
          <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
            {signedOut ? "—" : (rhrMetric?.formattedCurrent ?? "52 bpm")}
          </AppText>
          <AppText role="caption" secondary numberOfLines={1}>
            {signedOut ? "No data" : (rhrMetric?.statusLabel ?? "Normal")}
          </AppText>
        </Pressable>
      </View>

      {/* Prominent Selected Trend Chart with Baseline Corridor */}
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View style={{ gap: 2 }}>
            <AppText role="caption" secondary>{activeChart.title}</AppText>
            <View style={s.valueRow}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {signedOut ? "—" : activeChart.current}
              </AppText>
              {!signedOut && (
                <View style={s.trendPill}>
                  <AppText role="caption" style={{ color: c.tennis, fontWeight: "700" }}>
                    {activeChart.statusLabel}
                  </AppText>
                </View>
              )}
            </View>
          </View>

          <FocusSegments
            label="Health time lens"
            value={timeLens}
            options={TIME_LENSES}
            onChange={setTimeLens}
          />
        </View>

        {/* Interactive Chart with Baseline Corridor */}
        <View style={s.chartBody}>
          <StandardLineChart
            height={180}
            showAxes={true}
            values={activeChart.values}
            corridor={activeChart.corridor}
            pointLabels={activeChart.pointLabels}
            stroke={c.tennis}
            formatY={(v) => `${Math.round(v)} ${activeChart.unit}`}
            accessibilityLabel={`${activeChart.title} history trend with baseline corridor`}
          />
        </View>
      </View>

      {/* Contextual Health / Lab Insight Card */}
      <View style={s.insightCard}>
        <View style={s.insightIcon}>
          <AppText role="value" style={{ color: c.tennis }}>✦</AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText role="label" style={{ fontWeight: "700" }}>Health Insight</AppText>
          <AppText role="body" secondary style={{ lineHeight: 20 }}>
            {healthInsight}
          </AppText>
        </View>
      </View>

      {/* Key Signals vs. Baseline Breakdown */}
      <View style={{ gap: 12 }}>
        <View style={s.signalsHeader}>
          <AppText role="heading">Key Signals vs. Baseline</AppText>
        </View>

        <View style={s.signalsCard}>
          {baselineSignals.map((sig, i) => (
            <Pressable
              key={sig.id}
              accessibilityRole="button"
              accessibilityLabel={`${sig.name}: ${sig.current}, normal ${sig.normal}, ${sig.status}`}
              onPress={() =>
                router.push({
                  pathname: "/telemetry",
                  params: { domain: sig.domain, signedOut: signedOut ? "1" : undefined },
                })
              }
              style={[
                s.signalRow,
                i < baselineSignals.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.line },
              ]}
            >
              <View style={{ width: 110, gap: 2 }}>
                <AppText role="label" style={{ fontWeight: "600" }} numberOfLines={1}>
                  {sig.name}
                </AppText>
                <AppText role="caption" secondary numberOfLines={1}>
                  {sig.status}
                </AppText>
              </View>

              {/* Baseline Corridor Bar Indicator */}
              <View style={s.corridorMeter}>
                <View style={s.meterTrack}>
                  {/* Normal corridor shaded area */}
                  <View style={s.meterCorridor} />
                  {/* Current reading indicator point */}
                  <View style={[s.meterDot, { left: `${Math.round(sig.ratio * 100)}%` }]} />
                </View>
                <AppText role="caption" secondary style={{ fontSize: 10, textAlign: "center" }}>
                  {sig.normal}
                </AppText>
              </View>

              <View style={{ width: 68, alignItems: "flex-end" }}>
                <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                  {sig.current}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Advanced Analytics Bento Section (Exact 2x2 grid) */}
      <View style={{ gap: 12 }}>
        <View style={s.signalsHeader}>
          <AppText role="heading">Advanced Analytics</AppText>
        </View>

        <View style={s.bentoGrid}>
          {bentoTiles.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.kicker}, ${t.value}, ${t.delta}`}
              onPress={() =>
                router.push({
                  pathname: "/telemetry",
                  params: {
                    domain: t.domain,
                    signedOut: signedOut ? "1" : undefined,
                  },
                })
              }
              style={s.bentoTile}
            >
              <AppText role="caption" secondary numberOfLines={1}>
                {t.kicker}
              </AppText>
              <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                {t.value}
              </AppText>
              <MiniSparkline values={t.points} stroke={t.accent} corridor={t.corridor} />
              <AppText role="caption" secondary numberOfLines={1}>
                {t.delta}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const sThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
    container: {
      gap: 20,
    },
    readinessSupportBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
    },
    readinessBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: c.ink,
    },
    summaryCardsRow: {
      flexDirection: "row",
      gap: 8,
    },
    summaryCard: {
      flex: 1,
      padding: 12,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 4,
    },
    summaryCardActive: {
      borderColor: c.tennis,
      borderWidth: 1.5,
    },
    chartCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 14,
    },
    chartHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginVertical: 4,
    },
    trendPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
      backgroundColor: `${c.tennis}22`,
      alignSelf: "center",
    },
    chartBody: {
      marginTop: 8,
    },
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
    signalsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    signalsCard: {
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      overflow: "hidden",
    },
    signalRow: {
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    corridorMeter: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    meterTrack: {
      width: "100%",
      height: 8,
      borderRadius: 4,
      backgroundColor: c.line,
      position: "relative",
      justifyContent: "center",
    },
    meterCorridor: {
      position: "absolute",
      left: "25%",
      width: "50%",
      height: "100%",
      backgroundColor: `${c.tennis}33`,
      borderRadius: 4,
    },
    meterDot: {
      position: "absolute",
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.tennis,
      marginLeft: -6,
      borderWidth: 2,
      borderColor: c.card,
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
