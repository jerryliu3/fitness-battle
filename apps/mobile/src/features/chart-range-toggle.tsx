import { AppText } from "../ui/section";
import { TRAINING_CHART_RANGE_OPTIONS, type TrainingRange } from "@fitness-battle/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { SHELL_COLORS as c } from "../theme";

export function ChartRangeToggle({
  value,
  onChange,
}: {
  value: TrainingRange;
  onChange: (range: TrainingRange) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Training chart range"
      style={s.root}
    >
      {TRAINING_CHART_RANGE_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          accessibilityLabel={option.ariaLabel}
          onPress={() => onChange(option.value)}
          style={[s.btn, value === option.value && s.btnOn]}
        >
          <AppText
            role="label"
            style={{ color: value === option.value ? c.card : c.muted }}
          >
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
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
