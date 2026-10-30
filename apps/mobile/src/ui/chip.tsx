import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { AppText } from "./section";
import { SHELL_COLORS as c, SHELL_RADIUS } from "../theme";
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
      style={({ pressed }) => [s.chip, selected && s.chipSelected, style, pressed && { opacity: 0.7 }]}
    >
      <AppText
        role="label"
        style={[s.label, labelStyle]}
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
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: SHELL_RADIUS.pill,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: c.soft,
    borderColor: c.ink,
  },
  label: {
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
});
