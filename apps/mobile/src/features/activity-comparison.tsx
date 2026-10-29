import { createThemedStyles, useThemedStyles } from "../theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { activityComparisons, competeNow, type Activity, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { Chip, ChipRow } from "../ui/chip";
import { SHELL_COLORS as c } from "../theme";

export function ActivityComparison({ activity, state }: { activity: Activity; state: CompeteState; compact?: boolean }) {
  const s = useThemedStyles(sThemes);

  const comparisons = activityComparisons(activity, state.activities, state.units, competeNow(state));
  const [selected, setSelected] = useState<string>("time");
  if (!comparisons.length) return null;

  const metric = comparisons.find(item => item.id === selected) ?? comparisons[0]!;
  const max = Math.max(metric.current, metric.baseline);
  const currentLabel = metric.id === "frequency" ? "Last 30 days" : "This session";
  const baselineLabel = metric.id === "frequency" ? "Previous 30 days" : "Median";

  return <View style={s.section}>
    <AppText role="heading" accessibilityRole="header">Compared with your usual</AppText>
    <ChipRow>
      {comparisons.map(item => (
        <Chip
          key={item.id}
          label={item.label}
          selected={item.id === metric.id}
          onPress={() => setSelected(item.id)}
        />
      ))}
    </ChipRow>
    <View style={s.chart} accessibilityLabel={`${metric.label}. ${currentLabel}: ${metric.currentLabel}. ${baselineLabel}: ${metric.baselineLabel}.`} accessible>
      {[[currentLabel, metric.currentLabel, metric.current, true], [baselineLabel, metric.baselineLabel, metric.baseline, false]].map(([label, value, amount, current]) => <View key={String(label)} style={s.barRow}>
        <View style={s.barHeading}><AppText role="caption" secondary>{label}</AppText><AppText role="label">{value}</AppText></View>
        <View style={s.track}><View style={[s.bar, current ? s.current : s.previous, { width: `${max ? Math.max(6, Number(amount) / max * 100) : 0}%` }]}/></View>
      </View>)}
    </View>
  </View>;
}

const sThemes = createThemedStyles((themeColors) => ({
  section: { gap: 14, paddingVertical: 8 },
  chart: { gap: 14, paddingVertical: 8 },
  barRow: { gap: 6 },
  barHeading: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  track: { height: 12, backgroundColor: themeColors.soft, borderRadius: 6, overflow: "hidden" },
  bar: { height: 12, borderRadius: 6 },
  current: { backgroundColor: themeColors.tennis },
  previous: { backgroundColor: themeColors.fieldTeal },
}));
