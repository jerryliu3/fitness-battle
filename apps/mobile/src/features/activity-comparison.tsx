import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { activityComparisons, competeNow, type Activity, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { SHELL_COLORS as c } from "../theme";

export function ActivityComparison({ activity, state }: { activity: Activity; state: CompeteState }) {
  const comparisons = activityComparisons(activity, state.activities, state.units, competeNow(state));
  const [selected, setSelected] = useState<string>("time");
  if (!comparisons.length) return null;
  const metric = comparisons.find(item => item.id === selected) ?? comparisons[0]!;
  const max = Math.max(metric.current, metric.baseline);
  return <View style={s.section}>
    <AppText role="heading" accessibilityRole="header">This session in context</AppText>
    <AppText role="caption" secondary>Compare with your own {activity.sport} history</AppText>
    <View style={s.choices}>
      {comparisons.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === metric.id }} onPress={() => setSelected(item.id)} style={[s.choice, item.id === metric.id && s.selected]}>
        <AppText role="label" style={item.id === metric.id ? s.selectedText : undefined}>{item.label}</AppText>
      </Pressable>)}
    </View>
    <View style={s.chart} accessibilityLabel={`${metric.label}. This session: ${metric.currentLabel}. ${metric.id === "frequency" ? "Previous 30 days" : "Previous median"}: ${metric.baselineLabel}. ${metric.context}`} accessible>
      {[[metric.id === "frequency" ? "Last 30 days" : "This session", metric.currentLabel, metric.current, true], [metric.id === "frequency" ? "Previous 30 days" : "Previous median", metric.baselineLabel, metric.baseline, false]].map(([label, value, amount, current]) => <View key={String(label)} style={s.barRow}>
        <View style={s.barHeading}><AppText role="caption" secondary>{label}</AppText><AppText role="label">{value}</AppText></View>
        <View style={s.track}><View style={[s.bar, current ? s.current : s.previous, { width: `${max ? Number(amount) / max * 100 : 0}%` }]}/></View>
      </View>)}
    </View>
    <AppText role="caption" secondary>{metric.context}</AppText>
  </View>;
}

const s = StyleSheet.create({
  section: { gap: 10, paddingVertical: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  choice: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: c.line, borderRadius: 12 },
  selected: { backgroundColor: c.ink, borderColor: c.ink },
  selectedText: { color: c.card },
  chart: { gap: 12, paddingVertical: 8 },
  barRow: { gap: 5 },
  barHeading: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  track: { height: 9, backgroundColor: c.soft, borderRadius: 5, overflow: "hidden" },
  bar: { height: 9, borderRadius: 5 },
  current: { backgroundColor: c.tennis },
  previous: { backgroundColor: c.fieldTeal },
});
