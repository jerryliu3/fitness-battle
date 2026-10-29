import { AppText } from "../ui/section";
import { OPEN_LINE_RANGES, type OpenLineRange, type TrainingRange } from "@fitness-battle/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { SHELL_COLORS as c } from "../theme";

export function OpenLineRangeToggle({ value, onChange, includeYear = true, calendar = false }: { value: OpenLineRange; onChange: (range: OpenLineRange) => void; includeYear?: boolean; calendar?: boolean }) {
  return <View accessibilityRole="tablist" accessibilityLabel="Chart range" style={s.openRoot}>
    {OPEN_LINE_RANGES.filter(option => includeYear || option.value !== "year").map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: value === option.value }} accessibilityLabel={calendar && option.value === "fourWeeks" ? "One month" : option.ariaLabel} onPress={() => onChange(option.value)} style={s.openButton}><AppText role="label" style={{ color: value === option.value ? c.ink : c.muted }}>{calendar && option.value === "fourWeeks" ? "1M" : option.label}</AppText></Pressable>)}
  </View>;
}

export function ChartRangeToggle({ value, onChange }: { value: TrainingRange; onChange: (range: TrainingRange) => void }) {
 return <OpenLineRangeToggle calendar value={value === "month" ? "fourWeeks" : value} onChange={next => onChange(next === "fourWeeks" ? "month" : next)} />;
}
const s = StyleSheet.create({
  openRoot: { flexDirection: "row", gap: 4 },
  openButton: { minWidth: 44, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  root: {
    flexDirection: "row",
    gap: 2,
    padding: 2,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.soft,
  },
  btn: {
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOn: {
    backgroundColor: c.ink,
  },
});
