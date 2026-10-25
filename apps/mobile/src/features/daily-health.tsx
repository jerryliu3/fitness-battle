import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { HOME_HEALTH_COLORS as colors, HOME_HEALTH_ICON_PATHS, homeHealthMetrics, healthSparkline, type CompeteState } from "@fitness-battle/shared";
import { AppText, textStyle } from "../ui/section";

export function DailyHealth({ state }: { state: CompeteState }) {
  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { fontScale } = useWindowDimensions();
  const selected = metrics.find(metric => metric.id === expanded);
  return <View style={s.panel}>
    <View style={s.header}><AppText role="heading" accessibilityRole="header" style={{ color: colors.text }}>Today’s health</AppText><AppText role="caption" style={s.secondary}>Daily signals</AppText></View>
    <View style={s.grid}>{metrics.map((metric, index) => {
      const spark = healthSparkline(metric.history);
      return <Pressable key={metric.id} accessibilityRole="button" accessibilityLabel={`${metric.name}, ${metric.value}, ${metric.context}`} accessibilityHint="Show reading details" accessibilityState={{ expanded: metric.id === expanded }} onPress={() => setExpanded(expanded === metric.id ? null : metric.id)} style={[s.tile, { width: fontScale > 1.35 ? "100%" : "47%", flexGrow: 1 }, expanded === metric.id && { borderColor: colors.accent }]}>
        <View style={s.tileHeader}><AppText role="label" style={{ color: colors.text, flexShrink: 1 }}>{metric.name}</AppText><Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}><Path d={HOME_HEALTH_ICON_PATHS[metric.id]} fill="none" stroke={colors.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/></Svg></View>
        <Text style={s.value}>{metric.value}</Text><AppText role="caption" style={s.secondary}>{metric.context}</AppText>
        {spark.dots.length > 0 && <Svg width={80} height={36} viewBox="0 0 80 36" accessible={false} style={{ alignSelf: "flex-end", marginTop: "auto" }}>
          {spark.segments.map((points, i) => <Polyline key={i} points={points} fill="none" stroke={index % 2 ? colors.comparison : colors.accent} strokeWidth={2} strokeLinecap="round"/>)}
          {spark.dots.map((dot, i) => <Circle key={i} cx={dot.x} cy={dot.y} r={2} fill={index % 2 ? colors.comparison : colors.accent}/>)}
        </Svg>}
      </Pressable>;
    })}</View>
    {selected && <View style={s.detail} accessibilityLiveRegion="polite"><AppText role="label" style={{ color: colors.text }}>{selected.name}</AppText><AppText style={{ color: colors.text }}>{selected.detail}</AppText>{selected.history.some(value => value != null) && <AppText role="caption" style={s.secondary}>Mini chart: recorded duration over the last seven wake dates. Gaps mean no reading.</AppText>}</View>}
    <AppText role="caption" style={s.secondary}>Recorded readings only. Steps, resting HR and HRV aren’t connected yet.</AppText>
  </View>;
}
const s = StyleSheet.create({
  panel: { backgroundColor: colors.background, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { padding: 14, minHeight: 145, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.tile, gap: 8 },
  tileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 },
  value: { ...textStyle("display"), color: colors.text, fontVariant: ["tabular-nums"] },
  secondary: { color: colors.secondary },
  detail: { backgroundColor: colors.tile, borderRadius: 12, padding: 14, gap: 6 },
});
