import { formatCrewTargetLabel } from "@fitness-battle/shared";
import { Pressable, View } from "react-native";
import { playCue } from "../lib/haptics";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { Chip, ChipRow } from "./chip";
import { AppText } from "./section";

/** Tactile stepper + optional preset chips for choosing a numeric target without typing. */
export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  presets,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  presets?: readonly number[];
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const clamped = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  const decDisabled = disabled || clamped <= min;
  const incDisabled = disabled || clamped >= max;

  function apply(next: number) {
    void playCue("selection");
    onChange(Math.max(min, Math.min(max, Math.round(next * 10) / 10)));
  }

  return (
    <View style={s.root}>
      <View style={s.bar} accessibilityLabel={label}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={decDisabled}
          onPress={() => apply(clamped - step)}
          style={({ pressed }) => [
            s.btn,
            decDisabled && s.btnDisabled,
            pressed && !decDisabled && s.btnPressed,
          ]}
        >
          <AppText role="heading" style={{ color: c.ink }}>−</AppText>
        </Pressable>
        <View style={s.readout}>
          <AppText role="value" style={s.tabular}>
            {formatCrewTargetLabel(clamped, unit)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={incDisabled}
          onPress={() => apply(clamped + step)}
          style={({ pressed }) => [
            s.btn,
            incDisabled && s.btnDisabled,
            pressed && !incDisabled && s.btnPressed,
          ]}
        >
          <AppText role="heading" style={{ color: c.ink }}>+</AppText>
        </Pressable>
      </View>
      {presets && presets.length > 0 ? (
        <ChipRow>
          {presets.map((preset) => (
            <Chip
              key={preset}
              label={formatCrewTargetLabel(preset, unit)}
              selected={clamped === preset}
              onPress={() => {
                if (!disabled) apply(preset);
              }}
            />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );
}

const sThemes = createThemedStyles((c) => ({
  root: {
    gap: 10,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.72,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  readout: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));
