import {
  vitalsLabMetricsFromCompeteState,
  type CompeteState,
  type VitalsLabMetricDisplay,
  type VitalsLabMetricId,
} from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles } from "../../theme";
import { AppText } from "../../ui/section";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useVitalsLabController } from "./use-vitals-lab-controller";
import { useVitalsLabHostSource, VitalsLabCanvas } from "./vitals-lab-canvas";

const STAGE_HEIGHT = 380;

function MetricCard({
  metric,
  active,
  onPress,
  onDark = false,
}: {
  metric: VitalsLabMetricDisplay;
  active: boolean;
  onPress: () => void;
  onDark?: boolean;
}) {
  const s = useThemedStyles(cardThemes);
  const hasValue = Boolean(metric.value);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !hasValue }}
      disabled={!hasValue}
      onPress={onPress}
      style={[
        s.card,
        onDark && s.cardOnDark,
        active && hasValue && (onDark ? s.cardActiveOnDark : s.cardActive),
        !hasValue && s.cardMuted,
      ]}
    >
      <AppText
        role="caption"
        secondary={!onDark}
        style={onDark ? s.captionOnDark : undefined}
        numberOfLines={1}
      >
        {metric.label}
      </AppText>
      <AppText
        role="label"
        style={[{ fontVariant: ["tabular-nums"] }, onDark ? s.labelOnDark : undefined]}
      >
        {hasValue
          ? metric.unit
            ? `${metric.value} ${metric.unit}`
            : metric.value
          : "—"}
      </AppText>
    </Pressable>
  );
}

const cardThemes = createThemedStyles((theme) => ({
  card: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    gap: 2,
    width: 100,
  },
  cardOnDark: {
    borderColor: "rgba(108, 229, 232, 0.22)",
    backgroundColor: "rgba(8, 18, 24, 0.78)",
  },
  cardActive: {
    borderColor: theme.tennis,
  },
  cardActiveOnDark: {
    borderColor: "#F3C952",
  },
  cardMuted: {
    opacity: 0.72,
  },
  captionOnDark: {
    color: "rgba(232, 240, 242, 0.68)",
  },
  labelOnDark: {
    color: "#E8F0F2",
  },
}));

export type HealthLabChartMetric = "hrv" | "rhr" | "sleep";

function chartMetricFromVitals(id: VitalsLabMetricId): HealthLabChartMetric | null {
  if (id === "hrv" || id === "rhr" || id === "sleep") return id;
  return null;
}

const LAB_STAGE_BG = "#0a161d";

export function VitalsLabPanel({
  state,
  signedOut = false,
  onChartMetricChange,
  immersive = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
  onChartMetricChange?: (metric: HealthLabChartMetric) => void;
  immersive?: boolean;
}) {
  const s = useThemedStyles(panelThemes);
  const appearance = "dark" as const;

  const metrics = useMemo(
    () => vitalsLabMetricsFromCompeteState(state, { signedOut }),
    [state, signedOut],
  );
  const host = useVitalsLabHostSource();
  const assetBase = host?.assetBaseUrl ?? "";

  const lab = useVitalsLabController(metrics, appearance, assetBase, state?.gender);

  const selectMetric = (metric: VitalsLabMetricDisplay) => {
    lab.selectMetric(metric);
    const chart = chartMetricFromVitals(metric.id);
    if (chart && metric.value) onChartMetricChange?.(chart);
  };

  const renderMetricColumn = (items: VitalsLabMetricDisplay[]) => (
    <View style={s.metricCol}>
      {items.map((m) => (
        <MetricCard
          key={m.id}
          metric={m}
          active={lab.activeMetricId === m.id}
          onPress={() => selectMetric(m)}
          onDark
        />
      ))}
    </View>
  );

  return (
    <View
      style={[
        s.stage,
        immersive ? s.stageImmersive : { height: STAGE_HEIGHT },
        { backgroundColor: LAB_STAGE_BG },
      ]}
      accessibilityLabel="Vitals Lab body scan"
    >
      <VitalsLabCanvas model={lab.canvasModel} host={host} />
      <View style={s.hudOverlay} pointerEvents="box-none">
        <View pointerEvents="auto">{renderMetricColumn(lab.leftMetrics)}</View>
        <View style={s.hudSpacer} pointerEvents="none" />
        <View pointerEvents="auto">{renderMetricColumn(lab.rightMetrics)}</View>
      </View>
    </View>
  );
}

const panelThemes = createThemedStyles(() => ({
  stage: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  stageImmersive: {
    flex: 1,
    borderRadius: 0,
  },
  hudOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  hudSpacer: { flex: 1 },
  metricCol: { gap: 8, zIndex: 2 },
}));
