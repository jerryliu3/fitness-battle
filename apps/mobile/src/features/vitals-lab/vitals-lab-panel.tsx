import {
  VITALS_LAB_SYSTEM_PILLS,
  buildAnalyticsLabModel,
  type VitalsLabMetricDisplay,
} from "@fitness-battle/shared";
import { createThemedStyles, useAppTheme, useThemedStyles, useThemeColors } from "../../theme";
import { AppText } from "../../ui/section";
import { mobileEnv } from "../../lib/env";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useVitalsLabController } from "./use-vitals-lab-controller";
import { VitalsLabCanvas } from "./vitals-lab-canvas";

const STAGE_HEIGHT = 380;
const VIEW_ANGLES = [
  { id: "front", label: "Front", rad: 0 },
  { id: "side", label: "Side", rad: Math.PI / 2 },
  { id: "back", label: "Back", rad: Math.PI },
] as const;

function MetricCard({
  metric,
  active,
  onPress,
}: {
  metric: VitalsLabMetricDisplay;
  active: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(cardThemes);
  const accent = active ? c.tennis : c.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.card, active && s.cardActive]}
    >
      <AppText role="caption" secondary numberOfLines={1}>
        {metric.label}
      </AppText>
      <AppText role="label" style={{ fontVariant: ["tabular-nums"] }}>
        {metric.unit ? `${metric.value} ${metric.unit}` : metric.value}
      </AppText>
      <AppText role="caption" secondary numberOfLines={1} style={{ color: accent }}>
        {metric.status}
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
}));

export function VitalsLabPanel() {
  const { mode } = useAppTheme();
  const c = useThemeColors();
  const s = useThemedStyles(panelThemes);
  const appearance = mode === "dark" ? "dark" : "light";

  const analytics = useMemo(
    () => buildAnalyticsLabModel("peak_build", "30d"),
    [],
  );
  const assetBase = `${mobileEnv.apiUrl.replace(/\/$/, "")}/bodies/anny`;

  const lab = useVitalsLabController(analytics, appearance, assetBase);

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
    <View style={s.root} accessibilityLabel="Vitals Lab body scan">
      <View style={s.headRow}>
        <View>
          <AppText role="label">Vitals Lab</AppText>
          <AppText role="caption" secondary>
            Overnight vitals
          </AppText>
        </View>
        <View style={s.segRow}>
          {(["female", "male"] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => lab.setGender(g)}
              style={[s.seg, lab.gender === g && s.segOn]}
            >
              <AppText
                role="caption"
                style={lab.gender === g ? { color: c.ink } : undefined}
              >
                {g === "female" ? "Female" : "Male"}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.toolRow}>
        <View style={s.segRow}>
          {(["lumen", "outline"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => lab.setViewMode(mode)}
              style={[s.seg, lab.viewMode === mode && s.segOn]}
            >
              <AppText role="caption">
                {mode === "lumen" ? "Lumen" : "Outline"}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={lab.triggerScan} style={s.scanBtn}>
          <AppText role="caption" style={{ color: c.tennis }}>
            Scan
          </AppText>
        </Pressable>
      </View>

      <View style={[s.stage, { height: STAGE_HEIGHT }]}>
        <VitalsLabCanvas model={lab.canvasModel} />
        <View style={s.hudOverlay} pointerEvents="box-none">
          <View pointerEvents="auto">{renderMetricColumn(lab.leftMetrics)}</View>
          <View style={s.hudSpacer} pointerEvents="none" />
          <View pointerEvents="auto">{renderMetricColumn(lab.rightMetrics)}</View>
        </View>
      </View>

      <View style={s.cameraRow}>
        <Pressable onPress={() => lab.stepRotate(-1)} accessibilityLabel="Rotate left">
          <AppText role="caption">⟲</AppText>
        </Pressable>
        <View style={s.segRow}>
          {VIEW_ANGLES.map((v) => (
            <Pressable key={v.id} onPress={() => lab.setViewAngle(v.rad)} style={s.seg}>
              <AppText role="caption">{v.label}</AppText>
            </Pressable>
          ))}
          <Pressable
            onPress={() => lab.setAutoOrbit(!lab.autoOrbit)}
            style={[s.seg, lab.autoOrbit && s.segOn]}
          >
            <AppText role="caption">360°</AppText>
          </Pressable>
        </View>
        <Pressable onPress={() => lab.stepRotate(1)} accessibilityLabel="Rotate right">
          <AppText role="caption">⟳</AppText>
        </Pressable>
      </View>

      <View style={s.drawer}>
        <AppText role="label">{lab.headline}</AppText>
        <AppText role="caption" secondary>
          {lab.subline}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.pillRow}>
            {VITALS_LAB_SYSTEM_PILLS.map((pill) => (
              <Pressable
                key={pill.id}
                onPress={() => lab.selectSystem(pill.id)}
                style={[s.pill, lab.activeSystem === pill.id && s.pillOn]}
              >
                <AppText role="caption">{pill.label}</AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const panelThemes = createThemedStyles((theme) => ({
  root: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    padding: 12,
    gap: 10,
    overflow: "hidden",
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  toolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segRow: { flexDirection: "row", gap: 6 },
  seg: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
  },
  segOn: {
    borderColor: theme.tennis,
    backgroundColor: theme.soft,
  },
  scanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
  },
  stage: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.soft,
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
  cameraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  drawer: { gap: 6 },
  pillRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.soft,
  },
  pillOn: {
    borderColor: theme.tennis,
    backgroundColor: theme.soft,
  },
}));
