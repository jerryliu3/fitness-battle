import {
  vitalsLabMetricsFromCompeteState,
  type CompeteState,
  type VitalsLabMetricDisplay,
} from "@fitness-battle/shared";
import { createThemedStyles, useAppTheme, useThemedStyles } from "../../theme";
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
}: {
  metric: VitalsLabMetricDisplay;
  active: boolean;
  onPress: () => void;
}) {
  const s = useThemedStyles(cardThemes);
  const hasValue = Boolean(metric.value);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !hasValue }}
      disabled={!hasValue}
      onPress={onPress}
      style={[s.card, active && hasValue && s.cardActive, !hasValue && s.cardMuted]}
    >
      <AppText role="caption" secondary numberOfLines={1}>
        {metric.label}
      </AppText>
      <AppText role="label" style={{ fontVariant: ["tabular-nums"] }}>
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
  cardActive: {
    borderColor: theme.tennis,
  },
  cardMuted: {
    opacity: 0.72,
  },
}));

export function VitalsLabPanel({
  state,
  signedOut = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
}) {
  const { mode } = useAppTheme();
  const s = useThemedStyles(panelThemes);
  const appearance = mode === "dark" ? "dark" : "light";
  const stageBg = appearance === "dark" ? "#0a161d" : "#f3f6f7";

  const metrics = useMemo(
    () => vitalsLabMetricsFromCompeteState(state, { signedOut }),
    [state, signedOut],
  );
  const host = useVitalsLabHostSource();
  const assetBase = host?.assetBaseUrl ?? "";

  const lab = useVitalsLabController(metrics, appearance, assetBase);

  const renderMetricColumn = (items: VitalsLabMetricDisplay[]) => (
    <View style={s.metricCol}>
      {items.map((m) => (
        <MetricCard
          key={m.id}
          metric={m}
          active={lab.activeMetricId === m.id}
          onPress={() => lab.selectMetric(m)}
        />
      ))}
    </View>
  );

  return (
    <View
      style={[s.stage, { height: STAGE_HEIGHT, backgroundColor: stageBg }]}
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
