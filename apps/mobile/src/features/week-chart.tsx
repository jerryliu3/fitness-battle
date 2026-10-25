import { portfolioWeekChart, type CompeteState } from "@fitness-battle/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop } from "react-native-svg";
import { useId } from "react";
import { AppText, textStyle } from "../ui/section";
import { ChartScrubber } from "../ui/chart-scrubber";
import { ChartFrame } from "../ui/chart-frame";
import { HomeActivityActions } from "./home-activity-actions";
import { SHELL_COLORS as c, mobileSurfaces } from "../theme";

export function WeekChart({ state, onOpen, ready = true }: { state: CompeteState; onOpen?: () => void; ready?: boolean }) {
  const chart = portfolioWeekChart(state);
  const deltaUp = chart.currTotalHours >= chart.prevTotalHours;
  const gradient = useId().replace(/:/g, "");
  return <ChartFrame ready={ready}><View style={s.card}>
    <View style={s.header}><AppText role="heading" accessibilityRole="header">Current week</AppText><HomeActivityActions compact/></View>
    <View style={s.total}><Text style={s.number}>{chart.currTotalHours.toFixed(1)}<Text style={s.unit}> hrs</Text></Text><View style={s.comparison}><AppText role="caption" secondary>{chart.sessionCount} {chart.sessionCount === 1 ? "session" : "sessions"}</AppText><AppText role="caption" style={{ color: deltaUp ? c.green : c.statusError }}>{chart.deltaLabel}</AppText></View></View>
    <ChartScrubber label="This week’s cumulative training hours" points={chart.inspection} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} summaryOnSelection>
      <Svg width="100%" height={164} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" accessible={false}>
        <Defs><LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><Stop stopColor={c.fieldTeal} stopOpacity=".2"/><Stop offset="1" stopColor={c.fieldTeal} stopOpacity="0"/></LinearGradient></Defs>
        <Line x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} stroke={c.line}/>
        <Polyline points={chart.previous} fill="none" stroke={c.secondary} strokeWidth={1.5} strokeDasharray="3 5" opacity={.65}/>
        <Polygon points={chart.area} fill={`url(#${gradient})`}/>
        <Polyline points={chart.current} fill="none" stroke={c.fieldTeal} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
        <Circle cx={chart.tip.x} cy={chart.tip.y} r={4.5} fill={c.fieldTeal} stroke={c.card} strokeWidth={2}/>
      </Svg>
    </ChartScrubber>
    <View style={s.dates}><AppText role="caption" secondary>{chart.startLabel}</AppText><AppText role="caption" secondary>{chart.endLabel}</AppText></View>
    {onOpen && <Pressable accessibilityRole="button" accessibilityLabel="Explore your week" onPress={onOpen} style={s.open}><AppText role="label">Your week →</AppText></Pressable>}
  </View></ChartFrame>;
}
const s = StyleSheet.create({
  card: { paddingTop: 12, paddingBottom: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: mobileSurfaces.divider },
  header: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 },
  total: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 },
  number: { ...textStyle("hero"), color: c.ink, fontVariant: ["tabular-nums"] },
  unit: { ...textStyle("body"), color: c.muted },
  comparison: { gap: 4, alignItems: "flex-end", flexShrink: 1 },
  dates: { flexDirection: "row", justifyContent: "space-between" },
  open: { minHeight: 44, justifyContent: "center", alignSelf: "flex-end" },
});
