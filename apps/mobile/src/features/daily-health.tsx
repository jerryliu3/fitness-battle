import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { HOME_HEALTH_COLORS as colors, homeHealthMetrics, healthSignal, healthSignalRange, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";

export function DailyHealth({ state }: { state: CompeteState }) {
  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { fontScale, width } = useWindowDimensions();
  const selected = metrics.find(metric => metric.id === expanded);
  return <View style={s.panel}>
    <View style={s.header}><AppText role="heading" accessibilityRole="header" style={{ color: colors.text }}>Today’s health</AppText></View>
    <View style={s.grid}>{metrics.map(metric => {
      const signal = healthSignal(metric.history);
      return <Pressable key={metric.id} accessibilityRole="button" accessibilityLabel={`${metric.name}, ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}, ${metric.context}`} accessibilityHint="Show reading details" accessibilityState={{ expanded: metric.id === expanded }} onPress={() => setExpanded(expanded === metric.id ? null : metric.id)} style={[s.tile, { width: fontScale > 1.2 ? "100%" : "47%", flexGrow: 1, padding: width < 360 ? 8 : 14 }, expanded === metric.id && { borderColor: colors.accent }]}>
        <AppText role="label" style={{ color: colors.text }}>{metric.name}</AppText>
        <View style={[s.signal, { maxWidth: 160 * fontScale }]}>
          <Svg width="100%" height="100%" viewBox="0 0 144 144" accessible={false} style={StyleSheet.absoluteFill}>
            <Path d={signal.track} fill="none" stroke={colors.border} strokeWidth={7} strokeLinecap="round"/>
            {signal.ticks.map((tick, i) => <Line key={i} x1={tick.outer.x} y1={tick.outer.y} x2={tick.inner.x} y2={tick.inner.y} stroke={colors.comparison}/>)}
            {signal.fill && <Path d={signal.fill} fill="none" stroke={colors.accent} strokeWidth={7} strokeLinecap="round"/>}
          </Svg>
          <View style={s.reading}>
            <AppText role={fontScale > 1.2 || width >= 360 ? "value" : "body"} style={s.value}>{metric.value}</AppText>
            {!!metric.unit && <AppText role="caption" style={s.secondary}>{metric.unit}</AppText>}
          </View>
        </View>
        <AppText role="caption" style={s.secondary}>{healthSignalRange(metric)}</AppText>
      </Pressable>;
    })}</View>
    {selected && <View style={s.detail} accessibilityLiveRegion="polite"><AppText role="label" style={{ color: colors.text }}>{selected.name}</AppText><AppText style={{ color: colors.text }}>{selected.detail}</AppText>{selected.history.some(value => value != null) && <AppText role="caption" style={s.secondary}>The ring fills from zero to today’s reading. Its scale ends at the highest recorded reading in the last seven wake dates; it is not a goal.</AppText>}</View>}
  </View>;
}
const s = StyleSheet.create({
  panel: { backgroundColor: colors.background, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { padding: 14, minHeight: 200, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.tile, gap: 8 },
  value: { textAlign: "center", color: colors.text, fontVariant: ["tabular-nums"] },
  signal: { width: "100%", aspectRatio: 1 },
  reading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 4 },
  secondary: { color: colors.secondary },
  detail: { backgroundColor: colors.tile, borderRadius: 12, padding: 14, gap: 6 },
});
