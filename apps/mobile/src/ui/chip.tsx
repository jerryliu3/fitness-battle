import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { AppText } from "./section";
import { SHELL_COLORS as c } from "../theme";
import { playCue } from "../lib/haptics";

/**
 * Standard horizontal single-line chip container shared across the application.
 * Keeps selectors on 1 line and lets them overflow/scroll smoothly off-screen.
 */
export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[s.row, style]}
    >
      {children}
    </ScrollView>
  );
}

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

/**
 * Standard athletic/Strava/Airbnb-style selector chip.
 * Compact pill-shaped control with high hit affordance and subtle active states.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
  style,
  labelStyle,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={() => {
        void playCue("selection");
        onPress();
      }}
      style={[s.chip, selected && s.chipSelected, style]}
    >
      <AppText
        role={selected ? "label" : "caption"}
        secondary={!selected}
        style={[s.label, selected ? s.labelSelected : s.labelUnselected, labelStyle]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  label: {
    fontVariant: ["tabular-nums"],
  },
  labelUnselected: {
    color: c.ink,
  },
  labelSelected: {
    color: c.card,
  },
});
